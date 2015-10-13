import { values, sortByOrder, isEmpty } from 'lodash';
import moment from 'moment';

import React, { PropTypes } from 'react';
import { Button } from 'react-bootstrap';

import { Link } from 'react-router';
import { connect } from 'react-redux';
import { loadMLModels } from '../state/mlModels';
import { resetSelectedImages } from '../state/selectedImages';
import { algorithmNameMap } from '../constants/Algorithms';
import DashboardNav from '../components/DashboardNav';
import styles from './MLModels.scss';

const POLL_INTERVAL = 2500;

export default class MLModels extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    mlModels: PropTypes.object
  };

  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  loadMLModels() {
    this.props.dispatch(loadMLModels());
  }

  componentDidMount() {
    this.loadMLModels();
    this.interval = setInterval(this.loadMLModels.bind(this), POLL_INTERVAL);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  handleTrainNewModel() {
    const { router } = this.context;
    this.props.dispatch(resetSelectedImages());
    router.transitionTo('/models/new');
  }

  renderState(state) {
    switch (state) {
      case 'queued':
        return <span className="badge" style={{'backgroundColor': 'gray'}}>Queued</span>;
      case 'progress':
        return <span className="badge" style={{'backgroundColor': '#E48110'}}>In Progress…</span>;
      case 'success':
        return <span className="badge" style={{'backgroundColor': 'green'}}>Complete</span>;
      case 'failure':
        return <span className="badge" style={{'backgroundColor': '#DC0000'}}>Failed</span>;
    }
  }

  renderMLModels(mlModels) {
    const models = sortByOrder(values(mlModels), 'created', 'desc');
    return (
      <table className="table table-hover">
        <thead>
          <tr>
            <th className="col-md-3">Name</th>
            <th>Status</th>
            <th>Algorithm</th>
            <th>Cross-validation Type</th>
            <th>Training Duration</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {
            models.map(model =>
              <tr>
                <td>
                  <Link to={`/models/${model.id}`}>{model.name}</Link>
                </td>
                <td style={{height: 40}}>
                  { this.renderState(model.training_state) }
                </td>
                <td>{algorithmNameMap[model.input_data.algorithm]}</td>
                <td>{model.input_data.cv.type}</td>
                <td>
                  {model.output_data &&
                   model.output_data.duration &&
                   (Math.floor(model.output_data.duration) + ' sec')}
                </td>
                <td>
                  <span className="datetime">{moment(model.created).fromNow()}</span>
                </td>
              </tr>)
          }
        </tbody>
      </table>
    );
  }

  renderEmptyState() {
    return (
      <div style={{'textAlign': 'center'}}>
        <h3 style={{'color': 'lightgray'}}>No Trained Models Yet</h3>
      </div>
    );
  }

  render() {
    const { mlModels } = this.props;

    return (
      <div className={styles.root}>
        <DashboardNav router={this.context.router}>
          <Button bsStyle="primary"
                  className="pull-right"
                  onClick={this.handleTrainNewModel.bind(this)}><i className="fa fa-plus"></i> New Model</Button>
        </DashboardNav>

        <div className="row">
          <div className="col-md-12">
            { isEmpty(mlModels)
              ? this.renderEmptyState()
              : this.renderMLModels(mlModels) }
          </div>
        </div>
      </div>
    );
  }
}

function select(state) {
  return state;
}

export default connect(select)(MLModels);
