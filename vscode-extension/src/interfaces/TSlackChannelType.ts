import {
    SLACK_CHANNEL_CHANNEL_TYPE,
    SLACK_USER_CHANNEL_TYPE,
} from '../constants';

export type TSlackChannelType =
    | typeof SLACK_USER_CHANNEL_TYPE
    | typeof SLACK_CHANNEL_CHANNEL_TYPE;
