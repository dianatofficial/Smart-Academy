import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ExerciseHubComponent } from './pages/exercise-hub/exercise-hub.component';
import { TextExtractionHubComponent } from './pages/text-extraction-hub/text-extraction-hub.component';
import { ProgrammingHubComponent } from './pages/programming-hub/programming-hub.component';
import { ResearchHubComponent } from './pages/research-hub/research-hub.component';

export const APP_ROUTES: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'آکادمی هوشمند - صفحه اصلی'
  },
  {
    path: 'exercise-hub',
    component: ExerciseHubComponent,
    title: 'هاب حل تمرین'
  },
  {
    path: 'text-extraction-hub',
    component: TextExtractionHubComponent,
    title: 'هاب استخراج متن'
  },
  {
    path: 'programming-hub',
    component: ProgrammingHubComponent,
    title: 'هاب برنامه‌نویسی پروژه‌ها'
  },
  {
    path: 'research-hub',
    component: ResearchHubComponent,
    title: 'هاب دستیار پژوهش'
  },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
