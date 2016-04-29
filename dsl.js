'use strict';

const R = require('ramda');
const RF = require('ramda-fantasy');

const rules = {"inrange": [
  1,
  4,
  {"sum": ["!partners.LOWE.products"]},
]};

const basket = {
  transactions: [],
  "partners": {
    "LOWE": {
      "spend": 0,
      "products": {
        "47676": 2,
        "231046": 1,
        "258560": 0
      }
    }
  }
}

const leftWithString = str => R.compose(
  RF.Either.Left,
  R.concat(str)
);

const DSLTypes = {};

DSLTypes['Real'] = R.ifElse(
  isNaN,
  leftWithString('Not a valid Real Number: '),
  RF.Either.Right
);

DSLTypes['PosReal'] = R.compose(
  R.chain(
    R.ifElse(
      R.flip(R.gte())(0),
      RF.Either.Right,
      leftWithString('Not a valid Positive Real Number: ')
    )
  ),
  DSLTypes['Real']
);

DSLTypes['NegReal'] = R.compose(
  R.chain(
    R.ifElse(
      R.flip(R.lte())(0),
      RF.Either.Right,
      leftWithString('Not a valid Negative Real Number: ')
    )
  ),
  DSLTypes['Real']
);

DSLTypes['Integer'] = R.compose(
  R.chain(
    R.ifElse(
      R.converge(R.equals, [R.identity, Math.floor]),
      RF.Either.Right,
      leftWithString('Not a valid Integer: ')
    )
  ),
  DSLTypes['Real']
);

DSLTypes['Whole'] = R.compose(
  R.chain(
    R.ifElse(
      R.flip(R.gte)(0),
      RF.Either.Right,
      leftWithString('Not a valid Whole Number: ')
    )
  ),
  DSLTypes['Integer']
);

DSLTypes['Natural'] = R.compose(
  R.chain(
    R.ifElse(
      R.flip(R.gt)(0),
      RF.Either.Right,
      leftWithString('Not a valid Natural Number: ')
    )
  ),
  DSLTypes['Integer']
);

DSLTypes['NegWhole'] = R.compose(
  R.chain(
    R.ifElse(
      R.flip(R.lte)(0),
      RF.Either.Right,
      leftWithString('Not a valid Negative Whole Number: ')
    )
  ),
  DSLTypes['Integer']
);

DSLTypes['NegNatural'] = R.compose(
  R.chain(
    R.ifElse(
      R.flip(R.lt)(0),
      RF.Either.Right,
      leftWithString('Not a valid Negative Natural Number: ')
    )
  ),
  DSLTypes['Integer']
);

DSLTypes['Boolean'] = R.ifElse(
  R.compose(
    R.equals('boolean'),
    R.type
  ),
  RF.Either.Right,
  leftWithString('Not a valid Boolean: ')
);

DSLTypes['Any'] = RF.Either.Right;

const DSLFunctions = {};

const addFunction = (name, f, ...types) => {
  const argTypes = types.map(t => DSLTypes[t]).filter(t => t !== undefined);

  if (argTypes.length !== f.length) return RF.Either.Left('Not enough arguments adding function: ' + name);

  DSLFunctions[name] = function() {
    const args = R.values(arguments);
    const func = RF.Either.Right(R.curry(f));

    if (args.length === argTypes.length) {
      const mArgs = R.zip(argTypes, args).map(a => a[1].chain(val => a[0](val)));

      return mArgs.reduce((acc, val) => acc.ap(val), func);
    } else {
      return RF.Either.Left('Invalid Number of arguments calling function: ' + name);
    }
  }

  return RF.Either.Right('Successfully added Function: ' + name);
}

const runDSL = R.curry((Functions, Obj, Rule) => 
  RF.Either('Invalid Object', Object.keys(Rule)[0]).chain(opname => 
    RF.Either('Invalid Function: ' + opname, Functions[opname]).chain(operation =>
      RF.Either('Invalid Rule', Rule[opname]).chain(val => {
        if (val instanceof Array) {
          return RF.Either.Right(val.map(preParser(Functions, Obj, Rule)));
        }
        else {
          return RF.Either.Left('Invalid Parameters');
        }
      }).chain(operands => {
        const ans = operation.apply(null, operands);
        console.log(opname, operands, "=", ans);
        return ans;
      })
    )
  )
)

const isType = str => R.compose(
  R.equals(str),
  R.type
);

const isString = isType('String');
const isObject = isType('Object');

const isTemplate = R.compose(
  R.flip(R.gt)(0),
  R.length,
  R.match(/^!/)
);

const templateLens = R.compose(
  R.lensPath,
  R.split('.'),
  R.tail
);

const templateValue = Obj => R.compose(
  RF.Either('Invalid Substitution'),
  R.flip(R.view)(Obj),
  templateLens
);

const preParser = (Functions, Obj, Rule) => R.compose(
  R.chain(
    R.cond(
      [
        [isObject, runDSL(Functions, Obj)],
        [isString, R.ifElse(isTemplate, templateValue(Obj), RF.Either.Right)],
        [R.T, RF.Either.Right]
      ]
    )
  ),
  RF.Either('Null Object')
)

const inrange = (s, e, o) =>  R.converge(R.and, [R.flip(R.gte)(s), R.flip(R.lte)(e)])(o);
const sum = R.compose(R.sum, R.values);

/*console.log(DSLTypes['Integer'](2.3));
console.log(addFunction("add", R.add, 'Integer', 'Integer'));
console.log(DSLFunctions['add'](RF.Either.Right(2),RF.Either.Right(3)));
console.log(isString('ab'))
console.log(isTemplate('!abc'))
console.log(templateValue({a: 2})('!a'))
console.log(preParser(DSLFunctions, {a: 2}, rules)('!a'));
console.log(preParser(DSLFunctions, {a: 2}, rules)('abc'));
console.log(preParser(DSLFunctions, {a: 2}, rules)(9));*/


addFunction('and', R.and, 'Boolean', 'Boolean');
addFunction('or', R.or, 'Boolean', 'Boolean');
addFunction('gt', R.gt, 'Real', 'Real');
addFunction('lt', R.lt, 'Real', 'Real');
addFunction('gte', R.gte, 'Real', 'Real');
addFunction('lte', R.lte, 'Real', 'Real');
addFunction('inrange', inrange, 'Whole', 'Whole', 'Whole');
addFunction('sum', sum, 'Any');

const output = runDSL(DSLFunctions, basket, rules);
console.log(output);
