Twelf LSP
=========

An experiment to see if I can make an [LSP](https://en.wikipedia.org/wiki/Language_Server_Protocol) server for [Twelf](http://twelf.org) code.

It currently relies on [a version of twelf still in a branch](https://github.com/jcreedcmu/twelf/tree/jcreed/lsp-helpers).

Status
------

- Can react to `textDocument/didChange` by parsing the text of the document with `twelf.wasm`, and storing the results
- Can respond to `textDocument/definition` by looking for a constructor declaration that contains the current point, and jumping to the previous constructor declaration.

Emacs Testing
-------------

I'm testing the mode using `eglot` in emacs. Here's the elisp I added to my config for that purpose, where `".../twelf-lsp/twelf-lsp"` is replaced by the absolute path to the `twelf-lsp` script in this repository.

```cl
(use-package eglot)

(defvar fictional-mode-map
  (let ((map (make-sparse-keymap)))
    map)
  "Keymap for fictional-mode.")


(with-eval-after-load 'eglot
  (add-to-list 'eglot-server-programs
               '(fictional-mode . (".../twelf-lsp/twelf-lsp"))))

;; Define the mode
(define-derived-mode fictional-mode prog-mode "Fictional"
  "A major mode for testing purposes."
  )
(add-to-list 'auto-mode-alist '("\\.fiction\\'" . fictional-mode))

(defun start-fictional-lsp-server ()
  "Start my custom LSP server."
  (interactive)
  (setq eglot-server-programs '()))

(defun jcreed-fictional-mode-hook ()
  (interactive)
  (define-key fictional-mode-map (kbd "M-.") 'xref-find-definitions))

(add-hook 'fictional-mode-hook 'start-fictional-lsp-server)
(add-hook 'fictional-mode-hook 'jcreed-fictional-mode-hook)
```
