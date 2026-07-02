import { Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';
import { FeatureEditorDemoComponent } from './components/feature-editor-demo/feature-editor-demo.component';
import { FeatureSetEditorDemoComponent } from './components/feature-set-editor-demo/feature-set-editor-demo.component';
import { ChainOperationEditorDemoComponent } from './components/chain-operation-editor-demo/chain-operation-editor-demo.component';
import { SnapshotEditorDemoComponent } from './components/snapshot-editor-demo/snapshot-editor-demo.component';
import { BaseTextViewDemoComponent } from './components/base-text-view-demo/base-text-view-demo.component';
import { BaseTextPeepholeDemoComponent } from './components/base-text-peephole-demo/base-text-peephole-demo.component';
import { ChainResultViewDemoComponent } from './components/chain-result-view-demo/chain-result-view-demo.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'demo/chain-result-view', component: ChainResultViewDemoComponent },
  { path: 'demo/feature', component: FeatureEditorDemoComponent },
  { path: 'demo/feature-set', component: FeatureSetEditorDemoComponent },
  { path: 'demo/operation', component: ChainOperationEditorDemoComponent },
  { path: 'demo/base-text', component: BaseTextViewDemoComponent },
  { path: 'demo/base-text-peephole', component: BaseTextPeepholeDemoComponent },
  { path: 'demo/snapshot', component: SnapshotEditorDemoComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
];
