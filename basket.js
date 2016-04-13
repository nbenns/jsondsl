'use strict';

const R = require('ramda');

// An array of Basket line items
const basket = [[2, 'blah', 9.95, 19.9], [1, 'meow', 2.00, 2.00], [1, 'haha', 9.99, 9.99]];

// A Monoid Zero for conversion of basket items and reduction
const offerMZero = {
  products: {
    meow: 0,
    blah: 0 
  }
};

// Convert a basket item to a Monoid for the offer
const basket2OfferM = R.curry((Zero, b) => {
  let tmp = R.clone(Zero);

  if (tmp.products[b[1]] !== undefined) tmp.products[b[1]] = b[0]; 

  return tmp;
});

// Reduces a list of Monoids to a single one
const offerMRed = (o1, o2) => {
  let tmp = R.clone(o1);

  Object.keys(tmp.products).forEach(k => {
    tmp.products[k] = tmp.products[k] + o2.products[k];
  });

  return tmp;
};

// Map all basket items to Monoids
const offerMs = basket.map(basket2OfferM(offerMZero));
console.log(offerMs);
/*
* [ { products: { meow: false, blah: 2 } },
* { products: { meow: 1, blah: false } },
* { products: { meow: false, blah: false } } ]
*/

// Reduce to a Monoid under an OR like operation
const output = offerMs.reduce(offerMRed, offerMZero);
console.log(output);
// { products: { meow: 1, blah: 2 } }
