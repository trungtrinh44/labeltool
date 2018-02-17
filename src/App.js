import React, { Component } from 'react';
import './App.css';
import TextArea from './TextArea';
import { download } from './utils';
import categories from './categories.json';
import { PREDICT_API } from './constants';
import axios from 'axios';

class App extends Component {
  constructor() {
    super();
    categories.normal = {
      color: '#FFFFFF',
      shortcut: ' ',
    };
    this.state = {
      idx: -1,
    };
  }

  handleFileSelect = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    const newLocal = this;
    reader.onload = (ev) => {
      const data = JSON.parse(ev.target.result);
      newLocal.setState({
        data,
        name: file.name,
        idx: 0,
        runs: data.map(x => x.tags),
      });
    };
    if (file) {
      reader.readAsText(file);
    }
  };

  predict = () => {
    const {
      idx, data, runs,
    } = this.state;
    const newLocal = this;
    axios.post(PREDICT_API, [data[idx].content]).then((res) => {
      const newData = this.combineChunk(res.data[0][0]);
      // console.log(data[idx].content)
      data[idx].content = newData.content;
      runs[idx] = newData.runs;
      newLocal.setState({ data, runs });
      // console.log(data[idx].content);
      // console.log(runs[idx]);
    });
  }

  combineChunk = (chunks) => {
    const content = chunks.map(i => i[0]).join(' ');
    // console.log(chunks)
    const runs = {};
    let s = 0;
    let p = null;
    chunks.forEach((chunk, idx) => {
      runs[s] = {
        type: chunk[1],
        end: s + chunk[0].length,
        prev: p,
      };
      p = s;
      s += chunk[0].length;
      if (idx < chunks.length - 1) {
        runs[s] = {
          type: 'normal',
          end: s + 1,
          prev: p,
        };
        p = s;
        s += 1;
      }
    });
    s = 0;
    while (runs[s]) {
      const next = runs[runs[s].end];
      if (next && next.type === runs[s].type) {
        const nextNext = runs[next.end];
        const temp = runs[s].end;
        runs[s].end = next.end;
        if (nextNext) {
          nextNext.prev = s;
        }
        delete runs[temp];
      } else {
        s = runs[s].end;
      }
    }
    return { content, runs };
  }

  saveRuns(idx) {
    const { runs } = this.state;
    const newLocal = this;
    return (r) => {
      runs[idx] = r;
      newLocal.setState({ runs });
    };
  }
  saveAll = () => {
    const { data, runs, name } = this.state;
    const list = data.map((x, i) => ({ ...data[i], tags: runs[i] }));
    download(JSON.stringify(list), name, 'application/json');
  };

  render() {
    const {
      idx, data, runs, name,
    } = this.state;
    return (
      <div className="App container">
        {/* <input type="file" id="file" onChange={this.handleFileSelect} /> */}
        <div>
          <label className="btn btn-default btn-file" htmlFor="file">
            Browse
            <input
              id="file"
              type="file"
              style={{ display: 'none' }}
              onChange={this.handleFileSelect}
            />
          </label>
          <span>{name && name !== '' ? name : 'Choose file'}</span>
        </div>
        {data && [
          <span key="current-file">{`Current file: ${idx + 1}/${data.length}`}</span>,
          <button
            type="button"
            className="btn btn-default"
            key="previous"
            disabled={idx === 0}
            onClick={() => this.setState({ idx: idx - 1 })}
          >
            Previous
          </button>,
          <button
            type="button"
            className="btn btn-default"
            key="next"
            disabled={idx + 1 === data.length}
            onClick={() => this.setState({ idx: idx + 1 })}
          >
            Next
          </button>,
          <button
            type="button"
            className="btn btn-default"
            key="save"
            onClick={this.saveAll}
          >
            Save
          </button>,
          <button
            type="button"
            className="btn btn-default"
            key="predict"
            onClick={this.predict}
          >
            Predict
          </button>,
        ]}
        {idx >= 0 && data && data[idx] ? (
          <TextArea
            key="text-area"
            id={`article-${idx}`}
            text={data[idx].content}
            categories={categories}
            runs={runs[idx]}
            onSaved={this.saveRuns(idx)}
          />
        ) : null}
      </div>
    );
  }
}

export default App;
