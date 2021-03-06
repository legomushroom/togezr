export const TOGEZR_CONNECTED_BRANCHES_ISSUE_TITLE = '[Togezr]: Connected branches';

export const GITHUB_ISSUE_TOGEZR_LABEL_NAME = 'togezr';
export const GITHUB_ISSUE_TOGEZR_LABEL_DESCRIPTION = 'Better together_';
export const GITHUB_ISSUE_TOGEZR_LABEL_COLOR = '000000';

export const GITHUB_BOT_SECRET = process.env['GITHUB_BOT_SECRET'];
export const GITHUB_CLIENT_ID = process.env['GITHUB_CLIENT_ID'];
export const GITHUB_CLIENT_SECRET = process.env['GITHUB_CLIENT_SECRET'];
export const GITHUB_APP_ID = parseInt(process.env['GITHUB_APP_ID'], 10);
export const GITHUB_APP_PRIVATE_KEY = process.env['GITHUB_APP_PRIVATE_KEY'].replace(/\\n/gm, '\n');

if (!GITHUB_BOT_SECRET) {
    throw new Error('No GitHub Bot secret set.');
}

if (!GITHUB_CLIENT_ID) {
    throw new Error('No GitHub Client id set.');
}

if (!GITHUB_CLIENT_SECRET) {
    throw new Error('No GitHub Client app secret set.');
}

if (!GITHUB_APP_ID) {
    throw new Error('No GitHub App id set.');
}

if (!GITHUB_APP_PRIVATE_KEY) {
    throw new Error('No GitHub App private key set.');
}

export const GITHUB_ISSUE_TOGEZR_FOOTER_REGEX = /(\!\[togezr\sseparator\]\(https:\/\/aka\.ms\/togezr-issue-separator-image\)[\s\S]+\#\#\#\#\#\# powered by \[Togezr\]\(https\:\/\/aka\.ms\/togezr-issue-website-link\))/gm;
export const GITHUB_ISSUE_FOOTER_BADGE_REGEX = /\[!\[Live Share session\]\(https:\/\/togezr-vsls-session-badge\.azurewebsites\.net\/api\/vsls-compact-badge\?sessionId.+\)/gm;
export const GITHUB_ISSUE_FOOTER_USERS_REGEX = /\[\<img\ssrc="https:\/\/avatars\d{1,3}\.githubusercontent\.com.+\]\(https:\/\/github\.com\/.+\)/gm;
export const GITHUB_ISSUE_FOOTER_BRANCH_REGEX = /\*\*⎇\*\*\s+?\[.+\]\(https:\/\/github\.com\/.+\/.+\/tree\/.+\)\s+?\[\s?\[⇄\smaster\]\(https:\/\/github\.com\/.+\)\s\]/gm;
export const GITHUB_ISSUE_SESSION_COMMENT_REGEX = /\@.+\s+?started\s+?\[Live Share session\]\(.+\/join\?([A-Za-z0-9]{36}).+\)/gm;

export const GITHUB_ISSUE_FOOTER_SEPARATOR = '![togezr separator](https://aka.ms/togezr-issue-separator-image)';
export const GITHUB_ISSUE_FOOTER_POWERED_BY = '###### powered by [Togezr](https://aka.ms/togezr-issue-website-link)';

export const GITHUB_ISSUE_SESSION_COMMENT_SESSION_COMPLETE_LABEL  = '- 🤗 Session ended.';

export const SECOND_MS = 1000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * MINUTE_MS;
