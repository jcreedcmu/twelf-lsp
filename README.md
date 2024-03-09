Twelf LSP
=========

An experiment to see if I can make an [LSP](https://en.wikipedia.org/wiki/Language_Server_Protocol) server for [Twelf](http://twelf.org) code.

It currently relies on [a version of twelf still in a branch](https://github.com/jcreedcmu/twelf/tree/jcreed/lsp-helpers).

Status
------

- Can react to `textDocument/didChange` by parsing the text of the document with `twelf.wasm`, and storing the results
- Can respond to `textDocument/definition` by looking for a constructor declaration that contains the current point, and jumping to the previous constructor declaration.
