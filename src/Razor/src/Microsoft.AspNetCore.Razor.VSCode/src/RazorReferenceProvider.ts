/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { getRazorDocumentUri } from './RazorConventions';
import { RazorLanguageFeatureBase } from './RazorLanguageFeatureBase';
import { LanguageKind } from './RPC/LanguageKind';

export class RazorReferenceProvider
    extends RazorLanguageFeatureBase
    implements vscode.ReferenceProvider {

    public async provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.ReferenceContext,
        token: vscode.CancellationToken) {

        const projection = await this.getProjection(document, position, token);
        if (!projection) {
            return;
        }

        const references = await vscode.commands.executeCommand<vscode.Location[]>(
            'vscode.executeReferenceProvider',
            projection.uri,
            projection.position) as vscode.Location[];

        const results = new Array<vscode.Location>();
        if (projection.languageKind === LanguageKind.CSharp) {
            for (const reference of references) {
                const razorFile = getRazorDocumentUri(reference.uri);

                // Re-map the projected hover range to the host document range
                const res = await this.serviceClient.mapToDocumentRange(
                    projection.languageKind,
                    reference.range,
                    razorFile);

                if (res && document.version === res.hostDocumentVersion) {
                    results.push(new vscode.Location(razorFile, res.range));
                }
            }
        }

        if (projection.languageKind === LanguageKind.Html) {
            references.forEach(reference => {
                // Because the line pragmas for html are generated referencing the projected document
                // we need to remap their file locations to reference the top level Razor document.
                const razorFile = getRazorDocumentUri(reference.uri);

                results.push(new vscode.Location(razorFile, reference.range));
            });
        }

        return results;
    }
}
