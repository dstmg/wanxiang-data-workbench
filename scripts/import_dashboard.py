"""Read official ZIP/CSV exports without changing originals; emit local dashboard data."""
import csv
import io
import json
import re
import zipfile
import argparse
from collections import defaultdict
from decimal import Decimal
from pathlib import Path
from datetime import date, datetime

ROOT = Path(__file__).resolve().parents[1]
FIELDS = {'spend': '花费', 'revenue': '总成交金额', 'orders': '总成交笔数', 'clicks': '点击量', 'impressions': '展现量'}
ENGAGEMENT = {'favorites': '收藏宝贝数', 'cart': '总购物车数',
              'storeFavorites': '收藏店铺数', 'directCart': '直接购物车数', 'indirectCart': '间接购物车数',
              'directRevenue': '直接成交金额', 'indirectRevenue': '间接成交金额',
              'directOrders': '直接成交笔数', 'indirectOrders': '间接成交笔数'}
SPECS = {'overview': ('营销场景报表', '场景ID', '场景名字'), 'plans': ('计划报表', '计划ID', '计划名字'), 'products': ('商品报表', '主体ID', '主体名称'), 'regions': ('地域报表', '省', '省')}
SPECS.update({'keywords': ('关键词报表', '词ID/词包ID', '词名字/词包名字'), 'audiences': ('人群报表', '人群名字', '人群名字'), 'units': ('单元报表', '单元ID', '单元名字'), 'creatives': ('创意报表', '创意ID', '创意名字')})

def number(value):
    if value is None or value.strip() in ('', '-', '\\N'):
        return None
    return Decimal(value.replace(',', '').strip())

def metrics(rows):
    result = {}
    for key, column in {**FIELDS, **ENGAGEMENT}.items():
        values = [number(r.get(column)) for r in rows]
        # Missing values must not silently become zero or a misleading partial total.
        result[key] = float(sum(values, Decimal(0))) if values and all(v is not None for v in values) else None
    result['roi'] = result['revenue'] / result['spend'] if result['spend'] and result['revenue'] is not None else None
    result['ctr'] = result['clicks'] / result['impressions'] * 100 if result['impressions'] and result['clicks'] is not None else None
    result['cpc'] = result['spend'] / result['clicks'] if result['clicks'] and result['spend'] is not None else None
    return result

def build(period=7, report_dir=None):
    output = {'datasets': {}, 'sources': [], 'generatedAt': datetime.now().isoformat(timespec='seconds')}
    for kind, (report, id_col, name_col) in SPECS.items():
        directory = Path(report_dir) if report_dir else ROOT / 'data/reports'
        files = sorted(directory.glob(f'*{report}*.zip'))
        if not files:
            raise ValueError(f'缺少 {report}')
        source = files[-1]  # One snapshot per type; never add overlapping exports.
        with zipfile.ZipFile(source) as archive:
            if archive.testzip() is not None:
                raise ValueError('损坏的ZIP')
            members = [n for n in archive.namelist() if n.lower().endswith('.csv')]
            if len(members) != 1:
                raise ValueError('每个ZIP必须恰有一个CSV')
            raw = archive.read(members[0])
        try:
            text = raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            text = raw.decode('gb18030')
        reader = csv.DictReader(io.StringIO(text))
        parsed = list(reader)
        headers = reader.fieldnames or []
        rows = [r for r in parsed if re.fullmatch(r'\d{4}-\d{2}-\d{2}', r.get('日期', ''))]
        if len(rows) != len(parsed):
            raise ValueError(f'{report}存在非明细日期行，请人工确认')
        groups, days, detail_groups, plan_groups = defaultdict(list), defaultdict(list), defaultdict(list), defaultdict(list)
        for row in rows:
            if not row.get(id_col):
                raise ValueError(f'{report}缺少分组ID')
            groups[row[id_col]].append(row)
            days[row['日期']].append(row)
            detail_groups[(row['日期'], row[id_col])].append(row)
            if row.get('计划ID') and kind != 'plans':
                plan_groups[(row['日期'], row[id_col], row['计划ID'])].append(row)
        entries = [{'id': key, 'name': values[0][name_col], 'scene': values[0].get('场景名字', ''), **metrics(values)} for key, values in groups.items()]
        entries.sort(key=lambda r: r['spend'] or 0, reverse=True)
        dates = sorted(days)
        output['datasets'][kind] = {'total': metrics(rows), 'rows': entries, 'daily': [{'date': d, **metrics(days[d])} for d in dates], 'start': dates[0], 'end': dates[-1], 'sourceRows': len(rows)}
        confirmed = set(FIELDS.values()) | set(ENGAGEMENT.values())
        derived = {'投产比', '点击率', '平均点击花费'}
        output['datasets'][kind]['fieldCatalog'] = [
            {'name': column, 'status': '已展示 / 可汇总' if column in confirmed else
             '已展示 / 重算比率' if column in derived else
             '标识字段' if column == '日期' or column.endswith(('ID', '名字', '名称', '类型')) or column == '省' else
             '每日原值 / 汇总口径待确认',
             'missing': sum(r.get(column, '').strip() in ('', '-', '\\N') for r in rows)}
            for column in headers]
        # Keep each source row independently; do not aggregate unknown ratios,
        # deduplicated people, or silently merge rows sharing date/entity ID.
        output['datasets'][kind]['rawRows'] = [
            {'date': r['日期'], 'id': r[id_col], 'values': r} for r in rows]
        output['datasets'][kind]['details'] = [
            {'date': day, 'id': key, 'name': values[0][name_col],
             'scene': values[0].get('场景名字', ''), **metrics(values)}
            for (day, key), values in sorted(detail_groups.items())]
        output['datasets'][kind]['planDetails'] = [
            {'date': day, 'id': key, 'planId': plan_id, 'name': values[0][name_col],
             'scene': values[0].get('场景名字', ''), **metrics(values)}
            for (day, key, plan_id), values in sorted(plan_groups.items())]
        output['sources'].append({'type': report, 'file': source.name, 'rows': len(rows)})
    for kind in ('plans', 'products'):
        for key in FIELDS:
            if output['datasets'][kind]['total'][key] != output['datasets']['overview']['total'][key]:
                raise ValueError(f'{kind}与营销场景报表{key}不一致')
    windows = {(v['start'], v['end']) for v in output['datasets'].values()}
    if len(windows) != 1:
        raise ValueError('报表日期窗口不一致，请下载同周期报表')
    start, end = next(iter(windows))
    if (date.fromisoformat(end) - date.fromisoformat(start)).days + 1 != period:
        raise ValueError('实际日期范围与所选周期不一致')
    output['period'] = period
    destination = ROOT / f'data/dashboard-{period}.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix('.tmp')
    temporary.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(destination)
    if period == 7:
        (ROOT / 'data/dashboard.json').write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'status': 'ok', 'total': output['datasets']['overview']['total'], 'groups': {k: len(v['rows']) for k, v in output['datasets'].items()}}, ensure_ascii=True))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--period', type=int, choices=[7, 30], default=7)
    parser.add_argument('--report-dir')
    args = parser.parse_args()
    build(args.period, args.report_dir)
