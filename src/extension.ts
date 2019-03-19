"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as Maptz from "./MyFoldingRangeProvider";
import * as IConfiguration from "./IConfiguration";

let loadedConfig = vscode.workspace
  .getConfiguration()
  .get<IConfiguration.IConfiguration>("maptz.regionfolder");
let config: IConfiguration.IConfiguration = Object.assign(
  {},
  IConfiguration.DefaultConfiguration
);
config = Object.assign(config, loadedConfig);

//vscode.window.showInformationMessage("wrap");

const supportedLanguages: string[] = [];
for (let prop in config) {
  if (prop.startsWith("[") && prop.endsWith("]")) {
    const languageName = prop.substr(1, prop.length - 2);
    supportedLanguages.push(languageName);
    console.log("Supported languages: " + languageName);
  }
}

export function activate(context: vscode.ExtensionContext) {
  var disposables = [];
  let disposable3 = vscode.commands.registerCommand(
    "regionfolder.wrapWithRegion",
    () => {
      if (vscode.window.activeTextEditor) {
        /* #region Get the configuration for the current language */
        var ate = vscode.window.activeTextEditor;
        const languageId = ate.document.languageId;
        const currentLanguageConfig = config["[" + languageId + "]"];
        if (
          typeof currentLanguageConfig === "undefined" ||
          !currentLanguageConfig
        ) {
          vscode.window.showInformationMessage("Maptz Region Folding. No region folding available for language '" + languageId + "'. Check that you have the language extension installed for these files.");
          return;
        }
        /* #endregion */

        /* #region Check if there is anything selected. */
        if (ate.selections.length > 1 || ate.selections.length < 1) {
          return;
        }

        var sel = ate.selection;
        if (sel.isEmpty) {
          return;
        }
        /* #endregion */

        var linePrefix = ate.document.getText(
          new vscode.Range(new vscode.Position(sel.start.line, 0), sel.start)
        );
        var addPrefix = "";
        if (/^\s+$/.test(linePrefix)) {
          addPrefix = linePrefix;
        }
        var eol = getEOLStr(ate.document.eol);

        //Get the position of [NAME] in the fold start template.
        let regionStartTemplate = currentLanguageConfig.foldStart;
        const idx = regionStartTemplate.indexOf("[NAME]");
        const nameInsertionIndex = idx < 0 ? 0 : regionStartTemplate.length - "[NAME]".length - idx;
        const regionStartText = regionStartTemplate.replace("[NAME]", "");
                
        ate
          .edit(edit => {
            //Insert the #region, #endregion tags
            edit.insert(sel.end, eol + addPrefix + currentLanguageConfig.foldEnd);
            edit.insert(sel.start, regionStartText + eol + addPrefix);
          })
          .then(edit => {
            //Now, move the selection point to the [NAME] position.
            var sel = ate.selection;
            var newLine = sel.start.line - 1;
            var newChar = ate.document.lineAt(newLine).text.length - nameInsertionIndex;
            var newStart = sel.start.translate(
              newLine - sel.start.line,
              newChar - sel.start.character
            );
            var newSelection = new vscode.Selection(newStart, newStart);
            ate.selections = [newSelection];

            //Format the document
             vscode.commands.executeCommand(
               "editor.action.formatDocument",
               "editorHasDocumentFormattingProvider && editorTextFocus",
               true
             );
          });
      }
    }
  );
  disposables.push(disposable3);

  //See https://github.com/Microsoft/vscode/issues/48526
  //{ scheme: 'file', language:
  vscode.languages.registerFoldingRangeProvider(
    supportedLanguages,
    new Maptz.MyFoldingRangeProvider(config)
  );

  for (var disp of disposables) {
    context.subscriptions.push(disp);
  }
}

var getEOLStr = function(eol: vscode.EndOfLine) {
  if (eol === vscode.EndOfLine.CRLF) {
    return "\r\n";
  }
  return "\n";
};

// this method is called when your extension is deactivated
export function deactivate() {}
