// # Packrat parsing (PEG style)
//
// This is a parser combinator library for building [packrat parsers][].
// It was submitted as part of the artifacts for the 2017 paper [Incremental
// Packrat Parsing](https://ohmjs.org/pubs/sle2017/incremental-packrat-parsing.pdf).
//
// [Source](https://github.com/ohmjs/sle17/blob/a03cbbebeb7b7f5639ee0f72b6a3aafe9247dc9d/src/standard.js)
//
// [packrat parsers]: https://en.wikipedia.org/wiki/Packrat_parser
//
// **License:** [MIT](https://github.com/ohmjs/sle17/blob/a03cbbebeb7b7f5639ee0f72b6a3aafe9247dc9d/LICENSE)<br>
// **Copyright:** (c) 2017 Patrick Dubroy and Alessandro Warth

class Matcher {
  constructor(rules) {
    this.rules = rules;
  }

  match(input) {
    this.input = input;
    this.pos = 0;
    this.memoTable = [];
    const cst =
        new RuleApplication('start').eval(this);
    if (this.pos === this.input.length) {
      return cst;
    }
    return null;
  }

  hasMemoizedResult(ruleName) {
    const col = this.memoTable[this.pos];
    return col && col.has(ruleName);
  }

  memoizeResult(pos, ruleName, cst) {
    let col = this.memoTable[pos];
    if (!col) {
      col = this.memoTable[pos] = new Map();
    }
    if (cst !== null) {
      col.set(ruleName, { cst, nextPos: this.pos });
    } else {
      col.set(ruleName, {cst: null});
    }
  }

  useMemoizedResult(ruleName) {
    const col = this.memoTable[this.pos];
    const result = col.get(ruleName);
    if (result.cst !== null) {
      this.pos = result.nextPos;
      return result.cst;
    }
    return null;
  }

  consume(c) {
    if (this.input[this.pos] === c) {
      this.pos++;
      return true;
    }
    return false;
  }
}

class RuleApplication {
  constructor(ruleName) {
    this.ruleName = ruleName;
  }

  eval(matcher) {
    const name = this.ruleName;
    if (matcher.hasMemoizedResult(name)) {
      return matcher.useMemoizedResult(name);
    }
    const origPos = matcher.pos;
    const cst = matcher.rules[name].eval(matcher);
    matcher.memoizeResult(origPos, name, cst);
    return cst;
  }
}

class Terminal {
  constructor(str) {
    this.str = str;
  }

  eval(matcher) {
    for (const c of this.str) {
      if (!matcher.consume(c)) {
        return null;
      }
    }
    return this.str;
  }
}

class Choice {
  constructor(exps) {
    this.exps = exps;
  }

  eval(matcher) {
    const origPos = matcher.pos;
    for (const exp of this.exps) {
      matcher.pos = origPos;
      const cst = exp.eval(matcher);
      if (cst !== null) {
        return cst;
      }
    }
    return null;
  }
}

class Sequence {
  constructor(exps) {
    this.exps = exps;
  }

  eval(matcher) {
    const ans = [];
    for (const exp of this.exps) {
      const cst = exp.eval(matcher);
      if (cst === null) {
        return null;
      }
      if (!(exp instanceof Not)) {
        ans.push(cst);
      }
    }
    return ans;
  }
}

class Not {
  constructor(exp) {
    this.exp = exp;
  }

  eval(matcher) {
    const origPos = matcher.pos;
    if (this.exp.eval(matcher) === null) {
      matcher.pos = origPos;
      return true;
    }
    return null;
  }
}

class Repetition {
  constructor(exp) {
    this.exp = exp;
  }

  eval(matcher) {
    const ans = [];
    while (true) {
      const origPos = matcher.pos;
      const cst = this.exp.eval(matcher);
      if (cst === null) {
        matcher.pos = origPos;
        break;
      } else {
        ans.push(cst);
      }
    }
    return ans;
  }
}

return {Matcher, Terminal, RuleApplication, Choice, Sequence, Repetition, Not};
