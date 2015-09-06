require('console-shim');
require('promise.prototype.finally');

require('index.css');
require('handsontable.full.css');

import React from 'react';
import { Router, Route, Redirect } from 'react-router';
import { history } from 'react-router/lib/HashHistory';
import { Provider } from 'react-redux';

import App from './App';
import HomePage from './pages/HomePage';
import TrainModel from './pages/TrainModel';
import InputData from './components/InputData';
import TrainingLabel from './components/TrainingLabel';
import ModelPreferences from './components/ModelPreferences';
import ViewModel from './pages/ViewModel';
import TestPatternMap from './pages/TestPatternMap';
import configureStore from './store/configureStore';

const store = configureStore();

function renderRoutes(history) {
  return (
    <Router history={history}>
      <Route component={App}>
        <Route path="/" component={HomePage}/>
        <Redirect from="/train-model" to="/train-model/input-data" />
        <Route path="train-model" component={TrainModel}>
          <Route path="input-data" component={InputData}/>
          <Route path="training-label" component={TrainingLabel}/>
          <Route path="model-preferences" component={ModelPreferences}/>
        </Route>
        <Route path="model/:id" component={ViewModel} />
        <Route path="test-pattern-map" component={TestPatternMap}/>
      </Route>
    </Router>
  );
}

React.render((
  <Provider store={store}>
    {() => renderRoutes(history)}
  </Provider>
), document.getElementById('root'));
