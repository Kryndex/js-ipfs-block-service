'use strict'

const Block = require('./block')
const bl = require('bl')
const async = require('async')

// BlockService is a hybrid block datastore. It stores data in a local
// datastore and may retrieve data from a remote Exchange.
// It uses an internal `datastore.Datastore` instance to store values.
function BlockService (ipfsRepo, exchange) {
  this.addBlock = (block, callback) => {
    const ws = ipfsRepo.datastore.createWriteStream(block.key, block.extension)
    ws.write(block.data)
    ws.once('finish', callback)
    ws.end()
  }

  this.addBlocks = (blocks, callback) => {
    if (!Array.isArray(blocks)) {
      return callback(new Error('expects an array of Blocks'))
    }

    async.each(blocks, (block, next) => {
      this.addBlock(block, next)
    }, callback)
  }

  this.getBlock = (multihash, extension, callback) => {
    if (!multihash) {
      return callback(new Error('Invalid multihash'))
    }

    if (typeof extension === 'function') {
      callback = extension
      extension = undefined
    }

    ipfsRepo.datastore.createReadStream(multihash, extension)
      .pipe(bl((err, data) => {
        if (err) { return callback(err) }
        callback(null, new Block(data, extension))
      }))
  }

  this.getBlocks = (multihashes, extension, callback) => {
    if (!Array.isArray(multihashes)) {
      return callback(new Error('Invalid batch of multihashes'))
    }

    if (typeof extension === 'function') {
      callback = extension
      extension = undefined
    }

    const blocks = []

    async.each(multihashes, (multihash, next) => {
      this.getBlock(multihash, extension, (err, block) => {
        if (err) { return next(err) }
        blocks.push(block)
      })
    }, (err) => {
      callback(err, blocks)
    })
  }

  this.deleteBlock = (multihash, extension, callback) => {
    if (!multihash) {
      return callback(new Error('Invalid multihash'))
    }

    if (typeof extension === 'function') {
      callback = extension
      extension = undefined
    }

    ipfsRepo.datastore.remove(multihash, extension, callback)
  }

  this.deleteBlocks = (multihashes, extension, callback) => {
    if (!Array.isArray(multihashes)) {
      return callback('Invalid batch of multihashes')
    }

    if (typeof extension === 'function') {
      callback = extension
      extension = undefined
    }

    async.each(multihashes, (multihash, next) => {
      this.deleteBlock(multihash, extension, next)
    }, (err) => {
      callback(err)
    })
  }
}

module.exports = BlockService
