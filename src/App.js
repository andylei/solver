import React, { useState, useCallback } from 'react';
import './App.css';
import words_dict from './words/dict';
import words_wiki from './words/wiki';
import words_nyc from './words/nyc';

function useCycler(choices) {
  const n = choices.length;
  const [i, setI] = useState(0);
  const cycle = useCallback(() => setI(si => (si + 1) % n), [setI, n]);
  return [choices[i], cycle];
}

function useToggle(init) {
  const [onoff, setOnoff] = useState(init);
  const toggle = useCallback(() => setOnoff(b => !b), [setOnoff]);
  return [onoff, toggle];
}

function useInputState(init) {
  const [val, setVal] = useState(init);
  const onChange = useCallback(e => setVal(e.target.value), [setVal]);
  return [val, onChange];
}

function* concat() {
  for (let iter of arguments) {
    for (let x of iter) {
      yield x;
    }
  }
}

function choose_words(opts) {
  const { use_wiki, use_nyc, use_dict } = opts;
  const sets = [];
  if (use_wiki) {
    sets.push(words_wiki.words)
  }
  if (use_nyc) {
    sets.push(words_nyc.words)
  }
  if (use_dict) {
    sets.push(words_dict.words)
  }
  return concat(...sets);
}

function lcounts(word) {
  const count = {};
  for (let c of word) {
    if (c === '.') {
      continue;
    }
    count[c] = (count[c] || 0) + 1;
  }
  return count;
}

function matches_count(queryc, wordc) {
  for (let letter in queryc) {
    const c = queryc[letter];
    if ((wordc[letter] || 0) < c) {
      return false;
    }
  }
  return true;
}

function matches_inexact_count(qlen, queryc, word, wordc) {
  if (qlen > word.length) {
    return false;
  }
  return matches_count(queryc, wordc);
}

function matches_exact_count(qlen, queryc, word, wordc) {
  if (qlen !== word.length) {
    return false;
  }
  return matches_count(queryc, wordc);
}

function build_matcher(opts) {
  const { query, exact, mode } = opts;
  if (mode === 'pattern') {
    const qr = exact ? `^${query}$` : query;
    const re = new RegExp(qr);
    return w => re.test(w);
  } else if (mode === 'anagram') {
    const qc = lcounts(query);
    const ql = query.length;
    if (exact) {
      return w => matches_exact_count(ql, qc, w, lcounts(w));
    } else {
      return w => matches_inexact_count(ql, qc, w, lcounts(w));
    }
  }
}

function search(opts) {
  const { query, use_wiki, use_nyc, use_dict, exact, mode } = opts;
  const results = [];
  if (!query) {
    return results;
  }
  const words = choose_words(opts);
  const matcher = build_matcher(opts)
  for (let w of words) {
    if (matcher(w)) {
      results.push([-w.length, w]);
    }
  }
  return results.sort((a, b) => b[0] - a[0]).map(r => r[1]);
}

function _Results(props) {
  const results = search(props);
  if (!results.length && props.query) {
    return <div>
      No results
    </div>
  }
  return <pre>
    {results.join('\n')}
  </pre>
}

const Results = React.memo(_Results);

function App() {
  const [wDict, toggleWDict] = useToggle(true);
  const [wNyc, toggleWNyc] = useToggle(true);
  const [wWiki, toggleWWiki] = useToggle(false);
  const [isExact, toggleExact] = useToggle(true);
  const [qInput, changeQinput] = useInputState('');
  const [matchMode, cycleMatchMode] = useCycler(['pattern', 'anagram']);
  const [opts, setOpts] = useState();
  const search = useCallback(() => setOpts({
    query: qInput.toLowerCase(),
    use_wiki: wWiki,
    use_nyc: wNyc,
    use_dict: wDict,
    mode: matchMode,
    exact: isExact,
  }), [isExact, matchMode, qInput, wDict, wNyc, wWiki, setOpts]);
  return (
    <div className="App">
      <header className="App-header">
        Solver
      </header>
      <p className="controls">
        Query: <input value={qInput} onChange={changeQinput} />
      </p>
      <p className="controls">
        <label>
          <input type="checkbox" checked={isExact} onChange={toggleExact} />
          Exact
        </label>
        &nbsp;|&nbsp;
        Mode:<button onClick={cycleMatchMode}>{matchMode}</button>
      </p>
      <p className="controls">
        <label>
          <input type="checkbox" checked={wDict} onChange={toggleWDict} />
          Dictionary
        </label>
        &nbsp;|&nbsp;
        <label>
          <input type="checkbox" checked={wNyc} onChange={toggleWNyc} />
          NYC
        </label>
        &nbsp;|&nbsp;
        <label>
          <input type="checkbox" checked={wWiki} onChange={toggleWWiki} />
          Wikipedia
        </label>
      </p>
      <p><button onClick={search}>Search</button></p>
      <Results {...opts} />
    </div>
  );
}

export default App;
