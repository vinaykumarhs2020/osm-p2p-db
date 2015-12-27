var test = require('tape')
var hyperlog = require('hyperlog')
var fdstore = require('fd-chunk-store')
var path = require('path')
var memdb = require('memdb')
var collect = require('collect-stream')

var tmpdir = require('os').tmpdir()
var storefile = path.join(tmpdir, 'osm-store-' + Math.random())

var osmdb = require('../')

test('relation of ways', function (t) {
  var docs = {
    A: { type: 'node', loc: [ 64.5, -147.3 ] },
    B: { type: 'node', loc: [ 63.9, -147.6 ] },
    C: { type: 'node', loc: [ 64.2, -146.5 ] },
    D: { type: 'way', refs: [ 'A', 'B', 'C' ] },
    E: { type: 'node', loc: [ 62.1, -145.1 ] },
    F: { type: 'node', loc: [ 62.3, -146.4 ] },
    G: { type: 'node', loc: [ 62.6, -146.0 ] },
    H: { type: 'way', refs: [ 'E', 'F', 'G' ] },
    I: { type: 'relation', members: [ 'D', 'H' ] }
  }
  var keys = Object.keys(docs).sort()
  t.plan(keys.length + 4)

  var osm = osmdb({
    log: hyperlog(memdb(), { valueEncoding: 'json' }),
    db: memdb(),
    store: fdstore(4096, storefile),
    size: 4096
  })
  var names = {}
  var nodes = {}

  ;(function next () {
    if (keys.length === 0) return ready()
    var key = keys.shift()
    var doc = docs[key]
    if (doc.refs) {
      doc.refs = doc.refs.map(function (ref) { return names[ref] })
    }
    if (doc.members) {
      doc.memebers = doc.members.map(function (ref) { return names[ref] })
    }
    osm.create(doc, function (err, k, node) {
      t.ifError(err)
      names[key] = k
      nodes[k] = node
      next()
    })
  })()

  function ready () {
    var q0 = [[62,63],[-145.5,-144.5]]
    var ex0 = [
      { type: 'node', loc: [ 62.1, -145.1 ], id: names.E },
      { type: 'way', refs: [ names.E, names.F, names.G ] },
      { type: 'relation', members: [ names.D, names.H ] }
    ].sort(idcmp)
    osm.query(q0, function (err, res) {
      t.ifError(err)
      t.deepEqual(res.sort(idcmp), ex0, 'relation of ways')
    })
    collect(osm.queryStream(q0), function (err, res) {
      t.ifError(err)
      t.deepEqual(res.sort(idcmp), ex0, 'relation of ways stream')
    })
  }
})

function idcmp (a, b) {
  return a.id < b.id ? -1 : 1
}
