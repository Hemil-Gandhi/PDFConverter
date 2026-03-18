import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ConvertComponent } from './pages/convert/convert.component';
import { MergeComponent } from './pages/merge/merge.component';
import { SplitComponent } from './pages/split/split.component';
import { CompressComponent } from './pages/compress/compress.component';
import { EditComponent } from './pages/edit/edit.component';
import { WatermarkComponent } from './pages/watermark/watermark.component';
import { ProtectComponent } from './pages/protect/protect.component';
import { OrganizeComponent } from './pages/organize/organize.component';
import { TranslateComponent } from './pages/translate/translate.component';
import { HistoryComponent } from './pages/history/history.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'convert', component: ConvertComponent },
  { path: 'merge', component: MergeComponent },
  { path: 'split', component: SplitComponent },
  { path: 'compress', component: CompressComponent },
  { path: 'edit', component: EditComponent },
  { path: 'watermark', component: WatermarkComponent },
  { path: 'protect', component: ProtectComponent },
  { path: 'organize', component: OrganizeComponent },
  { path: 'translate', component: TranslateComponent },
  { path: 'history', component: HistoryComponent },
  { path: '**', redirectTo: '' }
];
