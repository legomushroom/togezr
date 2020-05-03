import * as path from 'path';
import {
    Disposable,
    Event,
    EventEmitter,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    window,
} from 'vscode';
import { accountsKeychain } from '../accounts/accountsKeychain';
import { IRegistryData } from '../commands/registerBranch/branchRegistry';
import {
    connectorRepository,
    TConnectors,
} from '../connectorRepository/connectorRepository';
import { EXTENSION_NAME_LOWERCASE } from '../constants';
import { IConnectorData } from '../interfaces/IConnectorData';
import { IGitHubIssue } from '../interfaces/IGitHubIssue';
import { ISlackChannel } from '../interfaces/ISlackChannel';
import { getIconPack } from '../utils/icons';
import { isCurrentBranchInRegistryData } from '../utils/isCurrentBranchInRegistryData';
import { AccountTreeItem } from './accounts/AccountTreeItem';
import { getAccountChildren } from './accounts/getAccountChildren';
import { getGitHubRepoIssues } from './github/getGitHubRepoIssues';
import { GitHubAccountRepoTreeItem } from './github/GitHubAccountRepoTreeItem';
import { getSlackChannels } from './slack/getSlackChannels';
import { getSlackUsers } from './slack/getSlackUsers';
import { resetSlackAccountCache } from './slack/slackAccountCache';
import { SlackChannelsTreeItem } from './slack/SlackChannelsTreeItem';
import { slackUserStatusRepository } from './slack/slackUserStatusRepository';
import { SlackUsersTreeItem } from './slack/SlackUsersTreeItem';
import { getTeamsChannels } from './teams/getTeamsChannels';
import { getTeamsTeams } from './teams/getTeamsTeams';
import { getTeamsUsers } from './teams/getTeamsUsers';
import { TeamsTeamsTreeItem } from './teams/TeamsTeamsTreeItem';
import { TeamsTeamTreeItem } from './teams/TeamsTeamTreeItem';
import { TeamsUsersTreeItem } from './teams/TeamsUsersTreeItem';

// const RUNNING_BRANCH_CONNECTIONS_ITEM = new TreeItem(
//     'Currently running',
//     TreeItemCollapsibleState.Expanded
// );

// const BRANCH_CONNECTIONS_ITEM = new TreeItem(
//     'Branch connections',
//     TreeItemCollapsibleState.Collapsed
// );

// const CONNECTORS_ITEM = new TreeItem(
//     'Connectors',
//     TreeItemCollapsibleState.Collapsed
// );

const ACCOUNTS_ITEM = new TreeItem(
    'Accounts',
    TreeItemCollapsibleState.Expanded
);

export class BranchConnectionTreeItem extends TreeItem {
    public registryData: IRegistryData;

    constructor(
        registryData: IRegistryData,
        collapsibleState: TreeItemCollapsibleState
    ) {
        const label = registryData.branchName
            ? registryData.branchName
            : path.basename(registryData.repoRootPath);

        collapsibleState = registryData.isRunning
            ? TreeItemCollapsibleState.Expanded
            : collapsibleState;

        super(label, collapsibleState);

        this.registryData = registryData;

        const isRunnable = isCurrentBranchInRegistryData(registryData);

        this.setIcon(isRunnable, registryData);
        this.setTooltip(label, registryData);
        this.setContextValue(isRunnable, registryData);
        this.setDescription(registryData);
    }

    private setIcon(isRunnable: boolean, registryData: IRegistryData) {
        const { isRunning, isReadOnly } = registryData;
        const iconNamePrefix = isRunning ? 'branch-running' : 'branch-inline';

        const iconNameSuffix = isReadOnly ? 'readonly-' : '';

        const middlePart = isRunnable && !isRunning ? 'runnable-' : '';

        this.iconPath = getIconPack(
            `${iconNamePrefix}-${middlePart}${iconNameSuffix}icon.svg`
        );
    }

    private setTooltip(label: string, registryData: IRegistryData) {
        const tooltipSuffix = registryData.isReadOnly ? '(read-only)' : '';
        this.tooltip = `${label} ${tooltipSuffix}`;
    }

    private setContextValue(isRunnable: boolean, registryData: IRegistryData) {
        const isRunnableSuffix = isRunnable ? '.runnable' : '';

        const contextValueSuffix = registryData.isRunning
            ? '.running'
            : isRunnableSuffix;

        this.contextValue = `togezr.branch.connection${contextValueSuffix}`;
    }

    private setDescription(registryData: IRegistryData) {
        this.description =
            registryData.branchName && registryData.repoId
                ? path.basename(registryData.repoId)
                : '';
    }
}

export class BranchGithubConnectionConnectorTreeItem extends TreeItem {
    public connectorData: IConnectorData;

    constructor(connectorData: IConnectorData) {
        const githubIssue: IGitHubIssue = connectorData.data.githubIssue;

        const connector = connectorRepository.getConnector(connectorData.id);

        if (!connector) {
            throw new Error(
                `No connector found for "${connectorData.type}" / "${connectorData.id}"`
            );
        }

        const label = `${connector.name}`;
        super(label);

        this.connectorData = connectorData;

        this.description = `Issue#${githubIssue.number}`;
        this.iconPath = getIconPack('github-connector-icon.svg');
        this.contextValue = 'togezr.connector.source';
    }
}

export class BranchSlackConnectionConnectorTreeItem extends TreeItem {
    public connectorData: IConnectorData;

    constructor(connectorData: IConnectorData) {
        const { channel, channelConnectionName } = connectorData.data as {
            channel: ISlackChannel;
            channelConnectionName: string;
        };
        const connector = connectorRepository.getConnector(connectorData.id);

        if (!connector) {
            throw new Error(
                `No connector found for "${connectorData.type}" / "${connectorData.id}"`
            );
        }

        const label = channelConnectionName;
        super(label);

        this.connectorData = connectorData;

        this.description = channel.purpose.value;

        this.iconPath = getIconPack('slack-connector-icon.svg');
        this.contextValue = 'togezr.connector.source';
    }
}

export class BranchTeamsConnectionConnectorTreeItem extends TreeItem {
    public connectorData: IConnectorData;

    constructor(connectorData: IConnectorData) {
        const connector = connectorRepository.getConnector(connectorData.id);

        if (!connector) {
            throw new Error(
                `No connector found for "${connectorData.type}" / "${connectorData.id}"`
            );
        }

        const label = connector.name;
        super(label);

        this.connectorData = connectorData;

        this.iconPath = getIconPack('teams-connector-icon.svg');
        // this.contextValue = 'togezr.connector.source';
    }
}

export class ConnectorTreeItem extends TreeItem {
    public id: string;

    public connector: TConnectors;

    public contextValue: string = 'togezr.connector';

    constructor(connector: TConnectors) {
        super(connector.name);

        this.id = connector.id;
        this.connector = connector;

        if (connector.type === 'GitHub' || connector.type === 'Slack') {
            this.contextValue = 'togezr.connector.openable';
        }

        this.iconPath = getIconPack(this.getConnectorIconName(connector));
    }

    private getConnectorIconName(connector: TConnectors) {
        if (connector.type === 'GitHub') {
            return 'github-icon.svg';
        }

        if (connector.type === 'Slack') {
            return 'slack-icon.svg';
        }

        if (connector.type === 'Teams') {
            return 'teams-icon.svg';
        }

        throw new Error(
            `Not know connector type: "${(connector as any).type}"`
        );
    }
}
export class ActivityBar implements TreeDataProvider<TreeItem>, Disposable {
    private _disposables: Disposable[] = [];

    private _onDidChangeTreeData = new EventEmitter<TreeItem>();
    public readonly onDidChangeTreeData: Event<TreeItem> = this
        ._onDidChangeTreeData.event;

    constructor() {
        // RUNNING_BRANCH_CONNECTIONS_ITEM.iconPath = getIconPack(
        //     'currently-running-icon.svg'
        // );
        // BRANCH_CONNECTIONS_ITEM.iconPath = getIconPack('branch-icon.svg');
        // CONNECTORS_ITEM.iconPath = getIconPack('connector-icon.svg');

        ACCOUNTS_ITEM.contextValue = 'togezr.accounts.header';

        slackUserStatusRepository.onUserStatus(() => {
            this._onDidChangeTreeData.fire();
        });

        setInterval(async () => {
            await slackUserStatusRepository.refreshStatuses();
        }, 5000);
    }

    public refresh() {
        this._onDidChangeTreeData.fire();
    }

    public getChildren = async (element?: TreeItem): Promise<TreeItem[]> => {
        // const branchConnections = getRegistryRecords();

        // const runningItem = Object.entries(branchConnections).find(
        //     ([name, registryData]) => {
        //         return registryData.isRunning;
        //     }
        // );

        if (!element) {
            const accounts = accountsKeychain.getAccountNames();
            ACCOUNTS_ITEM.label = `Accounts (${accounts.length})`;

            resetSlackAccountCache();

            const items = [
                // BRANCH_CONNECTIONS_ITEM,
                // CONNECTORS_ITEM,
                ACCOUNTS_ITEM,
            ];

            // if (runningItem) {
            //     items.unshift(RUNNING_BRANCH_CONNECTIONS_ITEM);
            // }

            return items;
        }

        // if (element === RUNNING_BRANCH_CONNECTIONS_ITEM) {
        //     if (!runningItem) {
        //         throw new Error(
        //             'Rendering running items but no running item found.'
        //         );
        //     }

        //     return [
        //         new BranchConnectionTreeItem(
        //             runningItem[1],
        //             TreeItemCollapsibleState.Collapsed
        //         ),
        //     ];
        // }

        // if (element === BRANCH_CONNECTIONS_ITEM) {
        //     const branchConnections = getRegistryRecords();
        //     const items = Object.entries(branchConnections).map(
        //         ([name, registryData]) => {
        //             const item = new BranchConnectionTreeItem(
        //                 registryData,
        //                 TreeItemCollapsibleState.Collapsed
        //             );

        //             return item;
        //         }
        //     );

        //     return items;
        // }

        // if (element === CONNECTORS_ITEM) {
        //     const connectors = connectorRepository.getConnectors();

        //     const items = connectors.map((connector) => {
        //         const item = new ConnectorTreeItem(connector);

        //         return item;
        //     });

        //     return items;
        // }

        if (element === ACCOUNTS_ITEM) {
            const accounts = await accountsKeychain.getAllAccounts();

            const items = accounts.map((account) => {
                const item = new AccountTreeItem(account);

                return item;
            });

            return items;
        }

        // if (element instanceof BranchConnectionTreeItem) {
        //     if (!element.registryData) {
        //         throw new Error(
        //             'No registryData set on BranchConnectionTreeItem.'
        //         );
        //     }
        //     const items = element.registryData.connectorsData.map(
        //         (connector) => {
        //             if (connector.type === 'GitHub') {
        //                 const item = new BranchGithubConnectionConnectorTreeItem(
        //                     connector
        //                 );

        //                 return item;
        //             }

        //             if (connector.type === 'Slack') {
        //                 const item = new BranchSlackConnectionConnectorTreeItem(
        //                     connector
        //                 );

        //                 return item;
        //             }

        //             if (connector.type === 'Teams') {
        //                 const item = new BranchTeamsConnectionConnectorTreeItem(
        //                     connector
        //                 );

        //                 return item;
        //             }

        //             throw new Error('Unknown connector type.');
        //         }
        //     );

        //     return items;
        // }

        if (element instanceof AccountTreeItem) {
            return await getAccountChildren(element);
        }

        /**
         * GitHub
         */

        if (element instanceof GitHubAccountRepoTreeItem) {
            return await getGitHubRepoIssues(element);
        }

        /**
         * Slack
         */

        if (element instanceof SlackUsersTreeItem) {
            return await getSlackUsers(element);
        }

        if (element instanceof SlackChannelsTreeItem) {
            return await getSlackChannels(element);
        }

        /**
         * Teams
         */
        if (element instanceof TeamsTeamsTreeItem) {
            return await getTeamsTeams(element);
        }

        if (element instanceof TeamsUsersTreeItem) {
            return await getTeamsUsers(element);
        }

        if (element instanceof TeamsTeamTreeItem) {
            return await getTeamsChannels(element);
        }

        return [];
    };

    public getTreeItem(node: TreeItem): TreeItem {
        return node;
    }

    public dispose() {
        this._disposables.forEach((disposable) => disposable.dispose());
    }
}

let treeDataProvider: ActivityBar;
export const registerActivityBar = () => {
    treeDataProvider = new ActivityBar();

    window.createTreeView(`${EXTENSION_NAME_LOWERCASE}.activitybar`, {
        treeDataProvider,
    });
};

export const refreshActivityBar = () => {
    if (!treeDataProvider) {
        throw new Error(
            'ActivityBar is not initialized, call `registerActivityBar` first.'
        );
    }

    treeDataProvider.refresh();
};
