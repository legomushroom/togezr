import * as vscode from 'vscode';
import {
    KNOWN_CONNECTOR_TYPES,
    TKnowConnectors,
} from '../../connectorRepository/connectorRepository';
import { CancellationError } from '../../errors/CancellationError';
import { GitHubConnectorCommandInitializer } from '../../sessionConnectors/commandInitializers/gitHubConnectorCommandInitializer';
import { SlackConnectorCommandInitializer } from '../../sessionConnectors/commandInitializers/slackConnectorCommandInitializer';
import { TeamsConnectorCommandInitializer } from '../../sessionConnectors/commandInitializers/teamsConnectorCommandInitializer';
import { GithubSessionConnector } from '../../sessionConnectors/github/githubSessionConnector';
import { SlackSessionConnector } from '../../sessionConnectors/slack/slackSessionConnector';
import { TeamsSessionConnector } from '../../sessionConnectors/teams/teamsSessionConnector';

const getConnectorCommandInitializer = (connectorType: TKnowConnectors) => {
    if (connectorType === 'GitHub') {
        return new GitHubConnectorCommandInitializer();
    }

    if (connectorType === 'Slack') {
        return new SlackConnectorCommandInitializer();
    }

    if (connectorType === 'Teams') {
        return new TeamsConnectorCommandInitializer();
    }

    throw new Error(
        `No connector command initializer for "${connectorType}" connector found.`
    );
};

export const getConnector = (connectorType: TKnowConnectors) => {
    if (connectorType === 'GitHub') {
        return GithubSessionConnector;
    }

    if (connectorType === 'Slack') {
        return SlackSessionConnector;
    }

    if (connectorType === 'Teams') {
        return TeamsSessionConnector;
    }

    throw new Error(`No connector for "${connectorType}" type found.`);
};

export const addConnectorCommand = async () => {
    let pickedConnector = KNOWN_CONNECTOR_TYPES[0];
    if (KNOWN_CONNECTOR_TYPES.length > 1) {
        pickedConnector = (await vscode.window.showQuickPick(
            KNOWN_CONNECTOR_TYPES,
            {
                placeHolder: 'Pick a connector type',
            }
        )) as TKnowConnectors;

        if (!pickedConnector) {
            throw new CancellationError();
        }
    }

    const initializer = getConnectorCommandInitializer(pickedConnector);

    await initializer.init();
};
