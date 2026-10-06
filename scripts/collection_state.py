"""Durable, local-only collection journal; exports are never resubmitted blindly."""
import json
import zipfile
from datetime import date, datetime, timedelta
from pathlib import Path
from import_dashboard import ROOT

def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    temp.replace(path)

def valid_zip(path):
    try:
        with zipfile.ZipFile(path) as archive:
            return archive.testzip() is None and len([x for x in archive.namelist() if x.lower().endswith('.csv')]) == 1
    except (OSError, zipfile.BadZipFile):
        return False

class Journal:
    def __init__(self, period, reports, root=ROOT):
        self.root = Path(root)
        self.path = self.root / f'data/collection-{period}.json'
        saved = json.loads(self.path.read_text(encoding='utf-8')) if self.path.exists() else None
        if saved and saved['state'] != 'complete':
            if saved['day'] != date.today().isoformat():
                raise RuntimeError('有跨日未完成任务，请先核对旧批次，不能混入今日周期')
            self.value = saved
            self.resumed = True
        else:
            # Official export input allows at most 32 characters. Millisecond
            # precision keeps even the longest report label below that limit.
            batch = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]
            end = date.today() - timedelta(days=1)
            self.value = dict(period=period, batch=batch, day=date.today().isoformat(), state='running',
                start=(end - timedelta(days=period - 1)).isoformat(), end=end.isoformat(),
                items=[dict(report=r, name=f'{r}_wx{period}_{batch}', state='pending') for r in reports])
            self.resumed = False
            self.save()
        self.directory = self.root / 'data/reports' / f'{period}days' / self.value['batch']
        self.directory.mkdir(parents=True, exist_ok=True)
        for item in self.value['items']:
            if item['state'] == 'downloaded' and not valid_zip(self.directory / item.get('file', '')):
                item['state'] = 'submitted'
        self.save()

    def save(self):
        atomic_json(self.path, self.value)

    @property
    def completed(self):
        return sum(x['state'] == 'downloaded' for x in self.value['items'])

    def update(self, item, state, **fields):
        item.update(state=state, **fields)
        self.save()
