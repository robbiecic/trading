use main;

CREATE TABLE IF NOT EXISTS auditLogs
(
    eventDate datetime not null,
    eventStatus varchar(100) null,
    eventAction varchar(100) null,
    eventDescription varchar(100) null
);


CREATE TABLE IF NOT EXISTS tradingHistory
(
    eventDate datetime not null,
    eventAction varchar(100) null,
    dealID varchar(100) null,
    dealReference varchar(100) null,
    epic varchar(100) null,
    level double null,
    size double null,
    direction varchar(100) null,
    profit double null,
    targetPrice double null
);
