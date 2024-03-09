import * as path from 'path';

// A lot of this code is taken from
// https://code.visualstudio.com/api/language-extensions/language-server-extension-guide

import {
  CompletionItem,
  CompletionItemKind,
  DefinitionParams,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeWatchedFilesNotification,
  InitializeParams,
  InitializeResult,
  LocationLink,
  ProposedFeatures,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection
} from 'vscode-languageserver/node';

import * as fs from 'fs';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { debug } from './debug';
import { mkWasmWrapper } from './wasm-wrapper';
import { ParseResult, mkTwelfService } from './twelf-service';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
  let capabilities = params.capabilities;
  debug('capabilities:', params.capabilities);

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true
      },
      definitionProvider: true,
    }
  };

  return result;
});

connection.onInitialized(() => {

});

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
  debug('change config', change);
  documents.all().forEach(validateTextDocument);
});



async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  let settings = globalSettings;

  // The validator creates diagnostics for all uppercase words length 2 and more
  let text = textDocument.getText();
  let pattern = /\b[A-Z]{2,}\b/g;
  let m: RegExpExecArray | null;

  let problems = 0;
  let diagnostics: Diagnostic[] = [];
  while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
    problems++;
    let diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Warning,
      range: {
        start: textDocument.positionAt(m.index),
        end: textDocument.positionAt(m.index + m[0].length)
      },
      message: `${m[0]} is all uppercase.`,
      source: 'ex'
    };
    diagnostics.push(diagnostic);
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    const p = textDocumentPosition.position;
    return [
      {
        label: 'TypeScript',
        kind: CompletionItemKind.Class,
        insertText: '',
        textEdit: { newText: 'foobar', range: { start: p, end: { line: p.line, character: p.character + 8 } } },
        data: 1
      },
      {
        label: 'JavaScript',
        kind: CompletionItemKind.Text,
        data: 2
      }
    ];
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
      item.detail = 'TypeScript details';
      item.documentation = 'TypeScript documentation';
    } else if (item.data === 2) {
      item.detail = 'JavaScript details';
      item.documentation = 'JavaScript documentation';
    }
    return item;
  }
);


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

async function go() {

  try {
    const twelf = await mkTwelfService(path.join(__dirname, '../assets/twelf.wasm'), () => { });
    const parseResults: Record<string, ParseResult> = {};

    documents.onDidChangeContent(change => {
      const doc = change.document;
      const pr = twelf.parse(doc.getText());
      parseResults[doc.uri] = pr;
      debug('output of parse', pr.output);
    });

    connection.onDefinition(async params => {
      debug('position:', params.position);
      const range = { start: { line: 3, character: 0 }, end: { line: 3, character: 5 } };
      const y = LocationLink.create(params.textDocument.uri, range, range);
      return [y];
    });

    connection.listen();
  }
  catch (e) {
    debug(e);
  }
}

go();
