import { Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';
import { FeatureEditorDemoComponent } from './components/feature-editor-demo/feature-editor-demo.component';
import { FeatureSetEditorDemoComponent } from './components/feature-set-editor-demo/feature-set-editor-demo.component';
import { ChainOperationEditorDemoComponent } from './components/chain-operation-editor-demo/chain-operation-editor-demo.component';
import { SnapshotEditorDemoComponent } from './components/snapshot-editor-demo/snapshot-editor-demo.component';
import { BaseTextViewDemoComponent } from './components/base-text-view-demo/base-text-view-demo.component';
import { AnimationTweenDemoComponent } from './components/animation-tween-demo/animation-tween-demo.component';
import { AnimationTimelineDemoComponent } from './components/animation-timeline-demo/animation-timeline-demo.component';
import { SnapshotViewDemoComponent } from './components/snapshot-view-demo/snapshot-view-demo.component';
import { AnimationTimelineSetDemoComponent } from './components/animation-timeline-set-demo/animation-timeline-set-demo.component';
import { ChainResultViewDemoComponent } from './components/chain-result-view-demo/chain-result-view-demo.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'demo/chain-result-view', component: ChainResultViewDemoComponent },
  { path: 'demo/feature', component: FeatureEditorDemoComponent },
  { path: 'demo/feature-set', component: FeatureSetEditorDemoComponent },
  { path: 'demo/operation', component: ChainOperationEditorDemoComponent },
  { path: 'demo/base-text', component: BaseTextViewDemoComponent },
  { path: 'demo/snapshot', component: SnapshotEditorDemoComponent },
  { path: 'demo/snapshot-view', component: SnapshotViewDemoComponent },
  { path: 'demo/animation-tween', component: AnimationTweenDemoComponent },
  {
    path: 'demo/animation-timeline',
    component: AnimationTimelineDemoComponent,
  },
  {
    path: 'demo/animation-timeline-set',
    component: AnimationTimelineSetDemoComponent,
  },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
];
