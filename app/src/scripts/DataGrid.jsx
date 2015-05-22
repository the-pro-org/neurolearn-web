'use strict';

import React from 'react';

require('handsontable');

export default class DataGrid extends React.Component {
  initHandsontableInstance(data) {
    var container = this.refs.hot.getDOMNode();

    var hot = new window.Handsontable(container, {
      data: data,
      minSpareRows: 1,
      rowHeaders: true,
      colHeaders: true
    });

    var selectedColumns = {
      fileName: null,
      trainingLabel: null
    };

    function makeBackground(col, td) {
      if (col === selectedColumns.fileName) {
        td.style.background = '#43aafd';
      }
      if (col === selectedColumns.trainingLabel) {
        td.style.background = '#f48225';
      }
    }

    function firstRowRenderer (instance, td, row, col) {

      window.Handsontable.renderers.TextRenderer.apply(this, arguments);
      td.style.fontWeight = 'bold';

      makeBackground(col, td);
    }

    function columnSelectorRenderer (instance, td, row, col) {

      window.Handsontable.renderers.TextRenderer.apply(this, arguments);

      makeBackground(col, td);
    }

    function useColumnAs(name, col) {
      selectedColumns[name] = col;
      hot.render();
    }

    hot.updateSettings({
      contextMenu: {
        callback: function (key) {
          if (key === 'use_as_filename') {
            useColumnAs('fileName', hot.getSelected()[1]);
          } else if (key === 'use_as_training_label') {
            useColumnAs('trainingLabel', hot.getSelected()[1]);
          }
        },
        items: {
          'use_as_filename': {
            name: 'Use as Filename'
          },
          'use_as_training_label': {
            name: 'Use as Training Label'
          },
          'hsep1': '---------',
          'row_above': {},
          'row_below': {},
          'hsep2': '---------',
          'col_left': {},
          'col_right': {},
          'hsep3': '---------',
          'remove_row': {},
          'remove_col': {},
          'hsep4': '---------',
          'undo': {},
          'redo': {}
        }
      },
      cells: function (row, col, prop) {
        var cellProperties = {};
        if (row === 0) {
          cellProperties.renderer = firstRowRenderer;
        } else {
          cellProperties.renderer = columnSelectorRenderer;
        }
        return cellProperties;
      }
    });

    return hot;
  }

  componentDidMount() {
    this.hot = this.initHandsontableInstance(this.props.data);
  }

  componentDidUpdate() {
    this.hot = this.initHandsontableInstance(this.props.data);
  }

  componentWillUnmount() {
    this.hot.destroy();
  }

  shouldComponentUpdate() {
    this.hot.destroy();
    return true;
  }

  render() {
    return (
      <div className="DataGrid" style={{height: 320, overflow: 'hidden'}}>
        <div ref="hot"/>
      </div>
    );
  }
}
