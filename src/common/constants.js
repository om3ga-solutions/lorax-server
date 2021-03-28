/**
* TRASHOUT IS an environmental project that teaches people how to recycle
* and showcases the worst way of handling waste - illegal dumping. All you need is a smart phone.
*
* FOR PROGRAMMERS: There are 10 types of programmers -
* those who are helping TrashOut and those who are not. Clean up our code,
* so we can clean up our planet. Get in touch with us: help@trashout.ngo
*
* Copyright 2017 TrashOut, n.f.
*
* This file is part of the TrashOut project.
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation; either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* See the GNU General Public License for more details: <https://www.gnu.org/licenses/>.
*/
'use strict';

module.exports.TRASH_ATTR_ID = 'id';
module.exports.TRASH_ATTR_GPS_SHORT = 'gpsShort';
module.exports.TRASH_ATTR_GPS_FULL = 'gpsFull';
module.exports.TRASH_ATTR_SIZE = 'size';
module.exports.TRASH_ATTR_IMAGES = 'images';
module.exports.TRASH_ATTR_TYPES = 'types';
module.exports.TRASH_ATTR_NOTE = 'note';
module.exports.TRASH_ATTR_STATUS = 'status';
module.exports.TRASH_ATTR_ACCESSIBILITY = 'accessibility';
module.exports.TRASH_ATTR_USER_INFO = 'userInfo';
module.exports.TRASH_ATTR_ANONYMOUS = 'anonymous';
module.exports.TRASH_ATTR_UPDATE_TIME = 'updateTime';
module.exports.TRASH_ATTR_UPDATE_HISTORY = 'updateHistory';
module.exports.TRASH_ATTR_URL = 'url';
module.exports.TRASH_ATTR_CREATED = 'created';
module.exports.TRASH_ATTR_CLEANED_BY_ME = 'cleanedByMe';
module.exports.TRASH_ATTR_UPDATE_NEEDED = 'updateNeeded';
module.exports.TRASH_ATTR_SPAM = 'spam';
module.exports.TRASH_ATTR_UNREVIEWED = 'unreviewed';
module.exports.TRASH_ALLOWED_ATTRIBUTES = [
  module.exports.TRASH_ATTR_ID,
  module.exports.TRASH_ATTR_GPS_SHORT,
  module.exports.TRASH_ATTR_GPS_FULL,
  module.exports.TRASH_ATTR_SIZE,
  module.exports.TRASH_ATTR_IMAGES,
  module.exports.TRASH_ATTR_TYPES,
  module.exports.TRASH_ATTR_NOTE,
  module.exports.TRASH_ATTR_STATUS,
  module.exports.TRASH_ATTR_ACCESSIBILITY,
  module.exports.TRASH_ATTR_USER_INFO,
  module.exports.TRASH_ATTR_ANONYMOUS,
  module.exports.TRASH_ATTR_UPDATE_TIME,
  module.exports.TRASH_ATTR_UPDATE_HISTORY,
  module.exports.TRASH_ATTR_URL,
  module.exports.TRASH_ATTR_CREATED,
  module.exports.TRASH_ATTR_CLEANED_BY_ME,
  module.exports.TRASH_ATTR_UPDATE_NEEDED,
  module.exports.TRASH_ATTR_SPAM,
  module.exports.TRASH_ATTR_UNREVIEWED
];

module.exports.TRASH_STATUS_CLEANED = 'cleaned';
module.exports.TRASH_STATUS_LESS = 'less';
module.exports.TRASH_STATUS_MORE = 'more';
module.exports.TRASH_STATUS_STILL_HERE = 'stillHere';
module.exports.TRASH_ALLOWED_STATUSES = [
  module.exports.TRASH_STATUS_CLEANED,
  module.exports.TRASH_STATUS_LESS,
  module.exports.TRASH_STATUS_MORE,
  module.exports.TRASH_STATUS_STILL_HERE
];

module.exports.TRASH_ACCESSIBILITY_BY_CAR = 'byCar';
module.exports.TRASH_ACCESSIBILITY_IN_CAVE = 'inCave';
module.exports.TRASH_ACCESSIBILITY_UNDER_WATER = 'underWater';
module.exports.TRASH_ACCESSIBILITY_NOT_FOR_GENERAL_CLEANUP = 'notForGeneralCleanup';
module.exports.TRASH_ALLOWED_ACCESSIBILITY_TYPES = [
  module.exports.TRASH_ACCESSIBILITY_BY_CAR,
  module.exports.TRASH_ACCESSIBILITY_IN_CAVE,
  module.exports.TRASH_ACCESSIBILITY_UNDER_WATER,
  module.exports.TRASH_ACCESSIBILITY_NOT_FOR_GENERAL_CLEANUP
];

module.exports.TRASH_ORDER_BY_ID = 'id';
module.exports.TRASH_ORDER_BY_NOTE = 'note';
module.exports.TRASH_ORDER_BY_ANONYMOUS = 'anonymous';
module.exports.TRASH_ORDER_BY_CREATED = 'created';
module.exports.TRASH_ORDER_BY_REVIEWED = 'reviewed';
module.exports.TRASH_ORDER_BY_STATUS = 'status';
module.exports.TRASH_ORDER_BY_GPS = 'gps';
module.exports.TRASH_ORDER_BY_SIZE = 'size';
module.exports.TRASH_ORDER_BY_UPDATE = 'update';
module.exports.TRASH_ALLOWED_ORDERING = [
  module.exports.TRASH_ORDER_BY_ID,
  module.exports.TRASH_ORDER_BY_NOTE,
  module.exports.TRASH_ORDER_BY_ANONYMOUS,
  module.exports.TRASH_ORDER_BY_CREATED,
  module.exports.TRASH_ORDER_BY_REVIEWED,
  module.exports.TRASH_ORDER_BY_STATUS,
  module.exports.TRASH_ORDER_BY_GPS,
  module.exports.TRASH_ORDER_BY_SIZE,
  module.exports.TRASH_ORDER_BY_UPDATE  
];

module.exports.TRASH_UPDATE_NEEDED_DAYS = 90;
module.exports.TRASH_MIN_DISTANCE = 10;

module.exports.COLLECTION_POINT_ATTR_ID = 'id';
module.exports.COLLECTION_POINT_ATTR_GPS_SHORT = 'gpsShort';
module.exports.COLLECTION_POINT_ATTR_GPS_FULL = 'gpsFull';
module.exports.COLLECTION_POINT_ATTR_SIZE = 'size';
module.exports.COLLECTION_POINT_ATTR_IMAGES = 'images';
module.exports.COLLECTION_POINT_ATTR_TYPES = 'types';
module.exports.COLLECTION_POINT_ATTR_NAME = 'name';
module.exports.COLLECTION_POINT_ATTR_NOTE = 'note';
module.exports.COLLECTION_POINT_ATTR_PHONE = 'phone';
module.exports.COLLECTION_POINT_ATTR_EMAIL = 'email';
module.exports.COLLECTION_POINT_ATTR_OPENING_HOURS = 'openingHours';
module.exports.COLLECTION_POINT_ATTR_USER_INFO = 'userInfo';
module.exports.COLLECTION_POINT_ATTR_UPDATE_TIME = 'updateTime';
module.exports.COLLECTION_POINT_ATTR_UPDATE_HISTORY = 'updateHistory';
module.exports.COLLECTION_POINT_ATTR_URL = 'url';
module.exports.COLLECTION_POINT_ATTR_CREATED = 'created';
module.exports.COLLECTION_POINT_ATTR_UPDATE_NEEDED = 'updateNeeded';
module.exports.COLLECTION_POINT_ATTR_SPAM = 'spam';
module.exports.COLLECTION_POINT_ATTR_UNREVIEWED = 'unreviewed';
module.exports.COLLECTION_POINT_ALLOWED_ATTRIBUTES = [
  module.exports.COLLECTION_POINT_ATTR_ID,
  module.exports.COLLECTION_POINT_ATTR_GPS_SHORT,
  module.exports.COLLECTION_POINT_ATTR_GPS_FULL,
  module.exports.COLLECTION_POINT_ATTR_SIZE,
  module.exports.COLLECTION_POINT_ATTR_IMAGES,
  module.exports.COLLECTION_POINT_ATTR_TYPES,
  module.exports.COLLECTION_POINT_ATTR_NAME,
  module.exports.COLLECTION_POINT_ATTR_NOTE,
  module.exports.COLLECTION_POINT_ATTR_PHONE,
  module.exports.COLLECTION_POINT_ATTR_EMAIL,
  module.exports.COLLECTION_POINT_ATTR_OPENING_HOURS,
  module.exports.COLLECTION_POINT_ATTR_USER_INFO,
  module.exports.COLLECTION_POINT_ATTR_UPDATE_TIME,
  module.exports.COLLECTION_POINT_ATTR_UPDATE_HISTORY,
  module.exports.COLLECTION_POINT_ATTR_URL,
  module.exports.COLLECTION_POINT_ATTR_CREATED,
  module.exports.COLLECTION_POINT_ATTR_UPDATE_NEEDED,
  module.exports.COLLECTION_POINT_ATTR_SPAM,
  module.exports.COLLECTION_POINT_ATTR_UNREVIEWED
];

module.exports.COLLECTION_POINT_ORDER_BY_ID = 'id';
module.exports.COLLECTION_POINT_ORDER_BY_NOTE = 'note';
module.exports.COLLECTION_POINT_ORDER_BY_CREATED = 'created';
module.exports.COLLECTION_POINT_ORDER_BY_REVIEWED = 'reviewed';
module.exports.COLLECTION_POINT_ORDER_BY_GPS = 'gps';
module.exports.COLLECTION_POINT_ORDER_BY_EMAIL = 'email';
module.exports.COLLECTION_POINT_ORDER_BY_PHONE = 'phone';
module.exports.COLLECTION_POINT_ALLOWED_ORDERING = [
  module.exports.COLLECTION_POINT_ORDER_BY_ID,
  module.exports.COLLECTION_POINT_ORDER_BY_NOTE,
  module.exports.COLLECTION_POINT_ORDER_BY_CREATED,
  module.exports.COLLECTION_POINT_ORDER_BY_REVIEWED,
  module.exports.COLLECTION_POINT_ORDER_BY_GPS,
  module.exports.COLLECTION_POINT_ORDER_BY_EMAIL,
  module.exports.COLLECTION_POINT_ORDER_BY_PHONE
];

module.exports.COLLECTION_POINT_UPDATE_NEEDED_DAYS = 90;

module.exports.EVENT_ATTR_ID = 'id';
module.exports.EVENT_ATTR_GPS_SHORT = 'gpsShort';
module.exports.EVENT_ATTR_GPS_FULL = 'gpsFull';
module.exports.EVENT_ATTR_IMAGES = 'images';
module.exports.EVENT_ATTR_NAME = 'name';
module.exports.EVENT_ATTR_DESCRIPTION = 'description';
module.exports.EVENT_ATTR_START = 'start';
module.exports.EVENT_ATTR_DURATION = 'duration';
module.exports.EVENT_ATTR_BRING = 'bring';
module.exports.EVENT_ATTR_HAVE = 'have';
module.exports.EVENT_ATTR_CONTACT = 'contact';
module.exports.EVENT_ATTR_CREATED = 'created';
module.exports.EVENT_ATTR_CHILD_FRIENDLY = 'childFriendly';
module.exports.EVENT_ATTR_URL = 'url';
module.exports.EVENT_ATTR_CLEANING_AREA = 'cleaningArea';
module.exports.EVENT_ATTR_TRASH_POINT_IDS = 'trashPointIds';
module.exports.EVENT_ATTR_COLLECTION_POINT_IDS = 'collectionPointIds';
module.exports.EVENT_ATTR_SPAM = 'spam';
module.exports.EVENT_ATTR_UNREVIEWED = 'unreviewed';
module.exports.EVENT_ALLOWED_ATTRIBUTES = [
  module.exports.EVENT_ATTR_ID,
  module.exports.EVENT_ATTR_GPS_SHORT,
  module.exports.EVENT_ATTR_GPS_FULL,
  module.exports.EVENT_ATTR_IMAGES,
  module.exports.EVENT_ATTR_NAME,
  module.exports.EVENT_ATTR_DESCRIPTION,
  module.exports.EVENT_ATTR_START,
  module.exports.EVENT_ATTR_DURATION,
  module.exports.EVENT_ATTR_BRING,
  module.exports.EVENT_ATTR_HAVE,
  module.exports.EVENT_ATTR_CONTACT,
  module.exports.EVENT_ATTR_CREATED,
  module.exports.EVENT_ATTR_CHILD_FRIENDLY,
  module.exports.EVENT_ATTR_URL,
  module.exports.EVENT_ATTR_CLEANING_AREA,
  module.exports.EVENT_ATTR_TRASH_POINT_IDS,
  module.exports.EVENT_ATTR_COLLECTION_POINT_IDS,
  module.exports.EVENT_ATTR_SPAM,
  module.exports.EVENT_ATTR_UNREVIEWED
];

module.exports.EVENT_ORDER_BY_ID = 'id';
module.exports.EVENT_ORDER_BY_NAME = 'name';
module.exports.EVENT_ORDER_BY_DESCRIPTION = 'description';
module.exports.EVENT_ORDER_BY_CREATED = 'created';
module.exports.EVENT_ORDER_BY_REVIEWED = 'reviewed';
module.exports.EVENT_ORDER_BY_GPS = 'gps';
module.exports.EVENT_ORDER_BY_START = 'start';
module.exports.EVENT_ALLOWED_ORDERING = [
  module.exports.EVENT_ORDER_BY_ID,
  module.exports.EVENT_ORDER_BY_NAME,
  module.exports.EVENT_ORDER_BY_DESCRIPTION,
  module.exports.EVENT_ORDER_BY_CREATED,
  module.exports.EVENT_ORDER_BY_REVIEWED,
  module.exports.EVENT_ORDER_BY_GPS,
  module.exports.EVENT_ORDER_BY_START
];

module.exports.SPAM_ORDER_BY_ID = 'id';
module.exports.SPAM_ORDER_BY_TRASH_POINT_ACTIVITY_ID = 'trashPointActivityId';
module.exports.SPAM_ORDER_BY_COLLECTION_POINT_ACTIVITY_ID = 'collectionPointActivityId';
module.exports.SPAM_ORDER_BY_REPORTED = 'reported';
module.exports.SPAM_ORDER_BY_RESOLVED = 'resolved';
module.exports.SPAM_ALLOWED_ORDERING = [
  module.exports.SPAM_ORDER_BY_ID,
  module.exports.SPAM_ORDER_BY_TRASH_POINT_ACTIVITY_ID,
  module.exports.SPAM_ORDER_BY_COLLECTION_POINT_ACTIVITY_ID,
  module.exports.SPAM_ORDER_BY_REPORTED,
  module.exports.SPAM_ORDER_BY_RESOLVED
];

module.exports.PR_CONTENT_DEFAULT_LANGUAGE = 'cs_CZ';

module.exports.PR_CONTENT_ORDER_BY_ID = 'id';
module.exports.PR_CONTENT_ORDER_BY_LANGUAGE = 'language';
module.exports.PR_CONTENT_ORDER_BY_TITLE = 'title';
module.exports.PR_CONTENT_ORDER_BY_BODY = 'body';
module.exports.PR_CONTENT_ORDER_BY_CREATED = 'created';
module.exports.USER_ALLOWED_ORDERING = [
  module.exports.PR_CONTENT_ORDER_BY_ID,
  module.exports.PR_CONTENT_ORDER_BY_LANGUAGE,
  module.exports.PR_CONTENT_ORDER_BY_TITLE,
  module.exports.PR_CONTENT_ORDER_BY_BODY,
  module.exports.PR_CONTENT_ORDER_BY_CREATED
];

module.exports.USER_ORDER_BY_ID = 'id';
module.exports.USER_ORDER_BY_EMAIL = 'email';
module.exports.USER_ORDER_BY_CREATED = 'created';
module.exports.USER_ORDER_BY_REVIEWED = 'reviewed';
module.exports.USER_ORDER_BY_FIRST_NAME = 'firstName';
module.exports.USER_ORDER_BY_LAST_NAME = 'lastName';
module.exports.USER_ALLOWED_ORDERING = [
  module.exports.USER_ORDER_BY_ID,
  module.exports.USER_ORDER_BY_EMAIL,
  module.exports.USER_ORDER_BY_CREATED,
  module.exports.USER_ORDER_BY_REVIEWED,
  module.exports.USER_ORDER_BY_FIRST_NAME,
  module.exports.USER_ORDER_BY_LAST_NAME
];

module.exports.USER_ROLE_SUPER_ADMIN = 'superAdmin';
module.exports.USER_ROLE_ADMIN = 'administrator'; // Loopback ACL role name collision workaroud ("admin" is special role in loobpack ACL)
module.exports.USER_ROLE_MANAGER = 'manager';
module.exports.USER_ROLE_AUTHENTICATED = 'authenticated';
module.exports.USER_ROLE_COMMON = 'common'; // Virtual role
module.exports.USER_ROLE_API_KEY = 'apiKey'; // Virtual role for unauthenticated users calling API with X-Api-Key instead of X-Token in header 
module.exports.USER_ROLE_FIREBASE_TOKEN = 'firebaseToken'; // virtual role
module.exports.USER_AREA_ROLE_ADMIN_ID = 1;
module.exports.USER_AREA_ROLE_MANAGER_ID = 2;
module.exports.USER_AREA_ROLE_MEMBER_ID = 3;
module.exports.USER_AREA_ROLE_ADMIN = 'admin';
module.exports.USER_AREA_ROLE_MANAGER = 'manager';
module.exports.USER_AREA_ROLE_MEMBER = 'member';

module.exports.METHOD_TRASH_POINT_DELETE = 'trashPointDelete';
module.exports.METHOD_TRASH_POINT_ACTIVITY_DELETE = 'trashPointDelete';
module.exports.METHOD_TRASH_POINT_ACTIVITY_IMAGE_DELETE = 'trashPointDelete';

module.exports.METHOD_COLLECTION_POINT_DELETE = 'collectionPointDelete';
module.exports.METHOD_COLLECTION_POINT_ACTIVITY_DELETE = 'collectionPointActivityDelete';
module.exports.METHOD_COLLECTION_POINT_ACTIVITY_IMAGE_DELETE = 'collectionPointImageDelete';

module.exports.METHOD_SPAM_DELETE = 'spamDelete';
module.exports.METHOD_SPAM_TRASH_POINT_DELETE = 'spamTrashPointDelete';
module.exports.METHOD_SPAM_COLLECTION_POINT_DELETE = 'spamCollectionPointDelete';
module.exports.METHOD_SPAM_EVENT_DELETE = 'spamEventDelete';
module.exports.METHOD_SPAM_RESOLVE = 'spamResolve';

module.exports.METHOD_USER_HAS_AREA_POST = 'userHasAreaPost';
module.exports.METHOD_USER_HAS_AREA_PUT = 'userHasAreaPut';

module.exports.METHOD_EVENT_DELETE = 'eventDelete';

module.exports.SPAM_TYPE_TRASH_POINT = 'trashPoint';
module.exports.SPAM_TYPE_TRASH_POINT_ACTIVITY = 'trashPointActivity';
module.exports.SPAM_TYPE_COLLECTION_POINT = 'collectionPoint';
module.exports.SPAM_TYPE_COLLECTION_POINT_ACTIVITY = 'collectionPointActivity';
module.exports.SPAM_TYPE_EVENT = 'event';

module.exports.SPAM_ORDER_BY_ID = 'id';
module.exports.SPAM_ORDER_BY_REPORTED = 'reported';
module.exports.SPAM_ALLOWED_ORDERING = [
  module.exports.SPAM_ORDER_BY_ID,
  module.exports.SPAM_ORDER_BY_REPORTED
];

module.exports.USER_AREA_ROLE_ADMIN = 'admin';
module.exports.USER_AREA_ROLE_MANAGER = 'manager';

module.exports.USER_ORGANIZATION_ROLE_MANAGER = 1;
module.exports.USER_ORGANIZATION_ROLE_MEMBER  = 2;

module.exports.ORGANIZATION_ORDER_BY_ID = 'id';
module.exports.ORGANIZATION_ORDER_BY_NAME = 'name';
module.exports.ORGANIZATION_ORDER_BY_CREATED = 'created';

module.exports.ADMIN_WEB_BASE_URL = 'https://admin.trashout.ngo';

module.exports.ACTIVITY_TYPE_TRASH_POINT = 'trashPoint';
module.exports.ACTIVITY_TYPE_COLLECTION_POINT = 'collectionPoint';
module.exports.ACTIVITY_TYPE_EVENT = 'event';
