"""Import a store-product snapshot locally. Never alters the source workbook."""
import argparse
import hashlib
import json
import os
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import openpyxl

def extract(source):
    workbook = openpyxl.load_workbook(source, data_only=True)
    sheet = workbook.active
    headers = [c.value for c in sheet[1]]
    required = ['商品信息', '图片链接', '价格', '销量', 'SKU', '商品链接']
    if any(h not in headers for h in required):
        raise ValueError('缺少必要字段：' + '、'.join(h for h in required if h not in headers))
    products, seen = [], set()
    for number, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), 2):
        if not any(v not in (None, '') for v in row):
            continue
        values = dict(zip(headers, row))
        url = str(values.get('商品链接') or '')
        parsed = urlparse(url)
        product_id = parse_qs(parsed.query).get('id', [''])[0]
        if parsed.scheme != 'https' or parsed.hostname not in ('item.taobao.com', 'detail.tmall.com') or not product_id.isdigit():
            raise ValueError(f'第{number}行商品链接或ID无效，未导入')
        if product_id in seen:
            raise ValueError(f'第{number}行商品ID重复：{product_id}，需先核对，未导入')
        seen.add(product_id)
        products.append(dict(id=product_id, name=str(values.get('商品信息') or ''), image=str(values.get('图片链接') or ''), price=values['价格'] if isinstance(values['价格'], (int, float)) else None, sales=values['销量'] if isinstance(values['销量'], (int, float)) else None, sku=str(values.get('SKU') or ''), url=url))
    if not products:
        raise ValueError('没有有效产品，未导入')
    date = re.search(r'\d{4}-\d{2}-\d{2}', sheet.title)
    return dict(version=1, source=Path(source).name, snapshotDate=date.group() if date else '日期未注明', sameShopConfirmed=True, products=products)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('--same-shop-confirmed', action='store_true', help='确认与当前推广报表为同一家店铺')
    parser.add_argument('--check', action='store_true', help='仅检查，不写入文件')
    args = parser.parse_args()
    if not args.same_shop_confirmed:
        parser.error('请核对产品表与当前推广报表店铺一致，然后添加 --same-shop-confirmed')
    data = extract(args.source)
    if args.check:
        print(f'检查通过：{len(data["products"])}个产品，ID有效且无重复。未写入文件。')
        raise SystemExit(0)
    directory = Path(os.environ.get('WANXIANG_DATA_DIR') or Path(__file__).resolve().parents[1] / 'data')
    directory.mkdir(parents=True, exist_ok=True)
    data['reportKeys'] = [hashlib.sha256(file.read_bytes()).hexdigest() for file in directory.glob('dashboard-*.json')]
    target = directory / 'product-catalog.json'
    if target.exists():
        backup = target.with_suffix('.json.previous')
        backup.write_bytes(target.read_bytes())
    temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(target)
    print(f'已导入{len(data["products"])}个产品；旧版本保留为 product-catalog.json.previous。刷新页面查看。')
