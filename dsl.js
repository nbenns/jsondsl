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

const DSLTypes = {
  "Real": r => {
		if (isNaN(r)) {
			return RF.Either.Left("Not a valid Real Number: " + r);
		} else {
			return RF.Either.Right(r);
		}
	},
	"PosReal": r =>
		DSLTypes["Number"](r).chain(p => {
			if (p >= 0) {
				return RF.Either.Right(p);
			} else {
				return RF.Either.Left("Not a valid Positive Real Number: " + p);
			}
		}),
	"NegReal": r =>
		DSLTypes["Real"](r).chain(p => {
			if (p <= 0) {
				return RF.Either.Right(p);
			} else {
				return RF.Either.Left("Not a valid Negative Real Number: " + p);
			}
		}),
	"Integer": r =>
		DSLTypes["Real"](r).chain(i => {
			const fi = Math.floor(i);
			
			if (fi == i) {
				return RF.Either.Right(fi);
			} else {
				return RF.Either.Left("Not a valid Integer: " + i);
			}
		}),
	"Whole": r =>
		DSLTypes["Integer"](r).chain(n => {
			if (n >= 0) {
				return RF.Either.Right(n);
			} else {
				return RF.Either.Left("Not a valid Whole Number: " + n);
			}
		}),
	"Natural": r =>
		DSLTypes["Whole"](r).chain(n => {
			if (n > 0) {
				return RF.Either.Right(n);
			} else {
				return RF.Either.Left("Not a valid Natural Number: " + n);
			}
		}),
	"NegWhole": r =>
		DSLTypes["Integer"](r).chain(n => {
			if (n <= 0) {
				return RF.Either.Right(n);
			} else {
				return RF.Either.Left("Not a valid Negative Whole Number: " + n);
			}
		}),
	"Negative": r =>
		DSLTypes["NegWhole"](r).chain(n => {
			if (n < 0) {
				return RF.Either.Right(n);
			} else {
				return RF.Either.Left("Not a valid Negative Number: " + n);
			}
		}),
	"Boolean": b => {
		if (typeof b === 'boolean') {
			return RF.Either.Right(b);
		} else {
			return RF.Either.Left('Not a valid Boolean: ' + b);
		}
	},
	"Any": a => RF.Either.Right(a)
}

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

const runDSL = (Functions, Rule, Obj) => {
	const preParser = o =>
		RF.Either("NULL Object", o).chain(val => {
			if (typeof val == 'object') {
				return runDSL(Functions, val, Obj);
			}
			else if (/^!/.exec(val)) {
				const objLens = R.lensPath(o.slice(1).split('.'));
				return RF.Either('Invalid substitution', R.view(objLens, Obj));
			}
			else return RF.Either.Right(val);
		});

	return RF.Either("Invalid Object", Object.keys(Rule)[0]).chain(opname => 
		RF.Either("Invalid Function: " + opname, Functions[opname]).chain(operation =>
			RF.Either("Invalid Rule", Rule[opname]).chain(val => {
				if (val instanceof Array) {
					return RF.Either.Right(val.map(preParser));
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
	);
};

const inrange = (s, e, o) => R.and(R.lte(s), R.gte(e))(o);
const sum = v => R.compose(R.sum, R.values)(v);

/*console.log(DSLTypes['Integer'](2.3));
console.log(addFunction("add", R.add, 'Integer', 'Integer'));
console.log(DSLFunctions['add'](RF.Either.Right(2),RF.Either.Right(3)));*/
addFunction('and', R.and, 'Boolean', 'Boolean');
addFunction('or', R.or, 'Boolean', 'Boolean');
addFunction('gt', R.gt, 'Real', 'Real');
addFunction('lt', R.lt, 'Real', 'Real');
addFunction('gte', R.gte, 'Real', 'Real');
addFunction('lte', R.lte, 'Real', 'Real');
addFunction('inrange', inrange, 'Whole', 'Whole', 'Whole');
addFunction('sum', sum, 'Any');

const output = runDSL(DSLFunctions, rules, basket);
console.log(output);
