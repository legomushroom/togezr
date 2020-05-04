import * as vscode from 'vscode';
import * as vsls from 'vsls';
import { refreshActivityBar } from '../activityBar/activityBar';
import { onCommitPushToRemote } from '../branchBroadcast/git/onCommit';
import { lsApi } from '../branchBroadcast/liveshare';
import { MINUTE_MS } from '../constants';
import { CancellationError } from '../errors/CancellationError';
import { TChannel, TChannelType } from '../interfaces/TChannel';
import * as memento from '../memento';
import { ISessionEvent } from '../sessionConnectors/renderer/events';
import { runningSessionsRegistry } from './RunningSessionsRegistry';

const HEARTBEAT_INTERVAL = 1000;
const CHANNEL_SESSION_PREFIX = 'togezr.channel.session';

type TPrimitive = string | number | boolean;

export interface IChannelMementoRecord {
    timestamp: number;
    events: ISessionEvent[];
    sessionId?: string;
    data?: { [key: string]: TPrimitive };
}

const userPlaceholder = {
    displayName: 'Oleg Solomka',
    userName: 'legomushroom',
    emailAddress: 'legomushroom@gmail.com',
    id: 'olsolomk',
};

export class ChannelSession {
    public events: ISessionEvent[] = [];

    public isDisposed: boolean = false;

    private heartbeatInterval: NodeJS.Timer | undefined;

    private id: string;

    private mementoRecordExpirationThreshold: number = 3 * MINUTE_MS;

    public type: TChannelType | 'generic' = 'generic';

    private getMementoId = () => {
        switch (this.channel.type) {
            case 'slack-user': {
                return this.channel.user.im.id;
            }

            case 'slack-channel': {
                return this.channel.channel.id;
            }

            case 'github-issue': {
                return this.channel.issue.html_url;
            }

            case 'teams-channel': {
                const { team, channel } = this.channel;

                return `${team.id}_${channel.id}`;
            }

            case 'teams-user': {
                const { user } = this.channel;

                return user.id;
            }

            default: {
                throw new Error(
                    `Unknown channel session type ${(this.channel as any).type}`
                );
            }
        }
    };

    constructor(
        public channel: TChannel,
        public siblingChannels: ChannelSession[],
        public sessionId?: string
    ) {
        const { account, type } = this.channel;
        if (!account) {
            throw new Error(
                `No account found for the channel "${channel.type}".`
            );
        }

        const { token } = account;
        if (!token) {
            throw new Error(
                `No token found for the account "${account.name}".`
            );
        }

        const path = vscode.workspace.rootPath;
        if (!path) {
            throw new Error('Cannot get workspace path.');
        }

        const suffix = this.getMementoId();
        this.id = `${CHANNEL_SESSION_PREFIX}.${type}.${account.name}.${suffix}`;

        this.readExistingRecord();
    }

    public readExistingRecord() {
        if (!this.id) {
            throw new Error('Calculate channel session id first.');
        }

        const record = memento.get<IChannelMementoRecord | undefined>(this.id);
        if (!record) {
            return null;
        }

        const delta = Date.now() - record.timestamp;
        if (delta >= this.mementoRecordExpirationThreshold) {
            this.deleteExistingRecord();
            return null;
        }

        this.events = record.events;

        if (!this.sessionId) {
            this.sessionId = record.sessionId;
        }

        return record;
    }

    public deleteExistingRecord = () => {
        memento.remove(this.id);
    };

    public init = async () => {
        const vslsApi = await lsApi();

        const { session } = vslsApi;
        if (!session.id) {
            throw new CancellationError('No LiveShare session found.');
        }

        this.sessionId = session.id;

        const startEventType = this.events.length
            ? 'restart-session'
            : 'start-session';

        // TODO: for some reason LS does not give the user id anymore
        const user = session.user || userPlaceholder;

        this.onEvent({
            type: startEventType,
            sessionId: session.id,
            user,
            timestamp: Date.now(),
        });

        vslsApi.onDidChangeSession(async (e: vsls.SessionChangeEvent) => {
            if (!e.session.id) {
                this.onEvent({
                    type: 'end-session',
                    timestamp: Date.now(),
                });

                await this.dispose();
                return;
            }
        });

        vslsApi.onDidChangePeers(async (e: vsls.PeersChangeEvent) => {
            if (this.isDisposed) {
                return;
            }

            if (e.removed.length) {
                return;
            }

            const userAdded = e.added[0];
            const { user } = userAdded;

            // TODO LS stopped returning the user object
            // if (!user || !user.id) {
            //     throw new Error('User not found or joined without id.');
            // }

            await this.onEvent({
                type: 'guest-join',
                user: user || userPlaceholder,
                timestamp: Date.now(),
            });
        });

        onCommitPushToRemote(async ([commit, repoUrl]) => {
            if (this.isDisposed) {
                return;
            }

            await this.onEvent({
                type: 'commit-push',
                commit,
                repoUrl,
                timestamp: Date.now(),
            });
        });

        this.heartbeatInterval = setInterval(
            this.persistData,
            HEARTBEAT_INTERVAL
        );

        runningSessionsRegistry.add({
            channel: this.channel,
            sessionId: this.sessionId,
        });

        refreshActivityBar();
    };

    public async onEvent(e: ISessionEvent) {
        /**
         * Don't add user join event twice.
         */
        if (e.type === 'guest-join') {
            const existingEvent = this.events.find((event) => {
                if (event.type !== 'guest-join') {
                    return false;
                }

                return event.user.id === e.user.id;
            });

            if (existingEvent) {
                return;
            }
        }

        this.events.push({ ...e });
        this.persistData();
    }

    public onPersistData = (record: IChannelMementoRecord) => {
        return record;
    };

    public persistData = () => {
        const record: IChannelMementoRecord = {
            timestamp: Date.now(),
            events: this.events,
            sessionId: this.sessionId,
        };

        const pipedRecord = this.onPersistData(record);
        memento.set(this.id, pipedRecord);
    };

    public dispose = async () => {
        this.isDisposed = true;

        runningSessionsRegistry.remove({
            channel: this.channel,
            sessionId: this.sessionId!,
        });

        refreshActivityBar();

        delete this.sessionId;

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    };
}
