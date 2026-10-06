import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from collection_state import Journal

class RecoveryTests(unittest.TestCase):
    def test_official_filename_limit(self):
        from collect_reports import REPORTS
        for period in (7, 30):
            with tempfile.TemporaryDirectory() as folder:
                job = Journal(period, REPORTS, folder)
                names = [item['name'] for item in job.value['items']]
                self.assertEqual(len(set(names)), len(REPORTS))
                self.assertTrue(all(len(name) <= 32 for name in names))

    def test_resume_each_period(self):
        for period in (7, 30):
            with tempfile.TemporaryDirectory() as folder:
                first = Journal(period, ['A', 'B'], folder)
                item = first.value['items'][0]
                target = first.directory / 'A.zip'
                with zipfile.ZipFile(target, 'w') as z:
                    z.writestr('A.csv', 'date,value\n2026-10-03,1\n')
                first.update(item, 'downloaded', file='A.zip')
                first.update(first.value['items'][1], 'submitting')
                resumed = Journal(period, ['A', 'B'], folder)
                self.assertTrue(resumed.resumed)
                self.assertEqual(resumed.completed, 1)
                self.assertEqual(resumed.value['items'][1]['state'], 'submitting')
                self.assertEqual(resumed.value['batch'], first.value['batch'])
                target.write_bytes(b'corrupt')
                checked = Journal(period, ['A', 'B'], folder)
                self.assertEqual(checked.completed, 0)
                self.assertEqual(checked.value['items'][0]['state'], 'submitted')

    def test_cross_day_does_not_resubmit(self):
        with tempfile.TemporaryDirectory() as folder:
            job = Journal(7, ['A'], folder)
            job.value['day'] = '2000-01-01'
            job.save()
            with self.assertRaises(RuntimeError):
                Journal(7, ['A'], folder)

if __name__ == '__main__':
    unittest.main()
