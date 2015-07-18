'use strict';

import styles from './SearchResult.scss';

import React from 'react';

export default class SearchResult extends React.Component {

  render() {
    var { name, number_of_images, images, authors } = this.props.hit._source;

    var thumbnail;

    if (images.length) {
      thumbnail = images[0].thumbnail;
    }

    return (
      <div className={styles.root}>
        <div className="row">
          <div className="title">
            <h3>{name}</h3>
            <p>{authors}</p>
          </div>
          <div className="images">
            <img src={thumbnail} className="img-responsive" />
            <div className="number-of-images">{number_of_images} images</div>
          </div>
          <div className="button">
            <button className="btn btn-primary btn-block">Select Images</button>
          </div>
        </div>
      </div>
    );
  }
}