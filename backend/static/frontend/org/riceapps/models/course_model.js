goog.provide('org.riceapps.models.CourseModel');

goog.require('goog.Promise');
goog.require('org.riceapps.models.Model');
goog.require('org.riceapps.models.InstructorModel');
goog.require('org.riceapps.protocol.Messages');

goog.scope(function() {



/**
 * @param {!org.riceapps.protocol.Messages.Course} data
 * @param {!org.riceapps.models.CoursesModel} coursesModel
 * @extends {org.riceapps.models.Model}
 * @constructor
 */
org.riceapps.models.CourseModel = function(data, coursesModel) {
  goog.base(this);

  /** @private {!org.riceapps.protocol.Messages.Course} */
  this.data_ = data;

  /** @private {!org.riceapps.models.CoursesModel} */
  this.coursesModel_ = coursesModel;

  /** @private {!Array.<!org.riceapps.models.InstructorModel>} */
  this.instructorModels_ = [];

  for (var i = 0; i < this.data_['instructors'].length; i++) {
    this.instructorModels_.push(new org.riceapps.models.InstructorModel(this.data_['instructors'][i]));
  }

  /** @private {Array.<!org.riceapps.models.CourseModel>} */
  this.otherSections_ = null;
};
goog.inherits(org.riceapps.models.CourseModel,
              org.riceapps.models.Model);
var CourseModel = org.riceapps.models.CourseModel;

/**
 * Represents the state of the filters for a given query.
 *
 * @typedef {{
 *   normal: boolean,
 *   d1: boolean,
 *   d2: boolean,
 *   d3: boolean,
 *   conflicts: boolean,
 *   full: boolean
 * }}
 */
CourseModel.Filter;


/**
 * Represents a time and place at which the course meets.
 *   day: 0 (Sunday) to 6 (Saturday)
 *   start: time at which course starts in hours elapsed since midnight
 *   end: time at which course ends in hours elapsed since midnight
 *   location: classroom where this meeting occurs
 *
 * @typedef {{
 *   day: {number},
 *   start: {number},
 *   end: {number},
 *   location: {string}
 * }}
 */
CourseModel.MeetingTime;


/**
 * @return {number}
 */
CourseModel.prototype.getId = function() {
  return this.data_['courseId'];
};


CourseModel.prototype.assertDistribution = function(type){
  return this.getDistributionType() === type;
}


/**
 * @param {!CourseModel.Filter} filters
 * @return {boolean}
 */
CourseModel.prototype.passesFilters = function(filters) {

  var distributionResponses = {
    "normal": 0,
    "d1": 1,
    "d2": 2,
    "d3": 3
  };

  return (
    (filters.normal && this.assertDistribution(0)) ||
    (filters.d1 && this.assertDistribution(1)) ||
    (filters.d2 && this.assertDistribution(2)) ||
    (filters.d3 && this.assertDistribution(3)));
};


/**
 * @return {!Array.<!CourseModel.MeetingTime>}
 */
CourseModel.prototype.getMeetingTimes = function() {
  var times = [];

  for (var i = 0; i < this.data_['meetingTimes'].length; i++) {
    // NOTICE: The reason for subtraction and division here is because the
    // format returned by the back-end differs from the values expected by
    // the other front-end components.
    var time = this.data_['meetingTimes'][i];
    var t = {
      'day' : time['day'] - 1,
      'start' : time['start'] / 60,
      'end' : time['end'] / 60,
      'location' : time['building'] + ' ' + time['room']
    };
    times.push(t);
  }

  return times;
};


/**
 * Returns all course meeting times that can be displayed on the calendar.
 * @return {!Array.<!CourseModel.MeetingTime>}
 */
CourseModel.prototype.getCalendarMeetingTimes = function() {
  var times = [];

  for (var i = 0; i < this.data_['meetingTimes'].length; i++) {
    // NOTICE: The reason for subtraction and division here is because the
    // format returned by the back-end differs from the values expected by
    // the other front-end components.
    var time = this.data_['meetingTimes'][i];
    var t = {
      'day' : time['day'] - 1,
      'start' : time['start'] / 60,
      'end' : time['end'] / 60,
      'location' : time['building'] + ' ' + time['room']
    };

    if (t['day'] < 0 || t['day'] > 4) {
      continue;
    }

    times.push(t);
  }

  return times;
};


/**
 * Returns the category that the course belongs to. The category is not guaranteed to be unique, as a single course may
 * have multiple sessions.
 * @return {string}
 */
CourseModel.prototype.getCourseCategory = function() {
  // A (subject, course number) pair uniquely identifies a course (which may have other sessions with different course
  // ids).
  return this.getSubject() + ' ' + this.getCourseNumber();
};


/**
 * @return {!org.riceapps.models.InstructorModel}
 */
CourseModel.prototype.getInstructor = function() {
  if (this.instructorModels_.length == 0) {
    return new org.riceapps.models.InstructorModel(/** @type {org.riceapps.protocol.Messages.Instructor} */ ({
      'instructorId': 0,
      'instructorName': 'Unknown'
    }));
  }

  return this.instructorModels_[0];
};


/**
 * @return {number}
 */
CourseModel.prototype.getCrn = function() {
  return this.data_['crn'];
};


/**
 * @return {string}
 */
CourseModel.prototype.getFormattedTermCode = function() {
  return '201420';
};


/**
 * Returns the four character course subject code (e.g. 'MATH').
 * @return {string}
 */
CourseModel.prototype.getSubject = function() {
  return this.data_['subject'];
};


/**
 * Returns the three digit course number (e.g. 101).
 * @return {number}
 */
CourseModel.prototype.getCourseNumber = function() {
  return this.data_['courseNumber'];
};


/**
 * @return {string}
 */
CourseModel.prototype.getTitle = function() {
  return this.data_['subject'] + " " + this.data_['courseNumber'] + ": " + this.data_['title'];
};

/**
 * This function gives you the score for how well this course matches the query.
 * Correct number is a score of 3, correct subject is a score of 2, correct title is a score of 1.
 * @param {string} query
 * @return {number}
 */
CourseModel.prototype.getMatchScore = function(query, queryNumber) {
  var total = 0;

  if (queryNumber === this.data_['courseNumber']+"")
    total += 3;
  else if (queryNumber === (this.data_['courseNumber']+"").substring(0,2))
    total += 2.5;
  else if (queryNumber === (this.data_['courseNumber']+"").substring(0,1))
    total += 2.2;
  if (goog.string.caseInsensitiveContains(query,this.data_['subject']))
    total += 2;
  if (goog.string.caseInsensitiveContains(this.data_['title'],query))
    total += 1;

  return total;
};


/**
 * @return {number}
 */
CourseModel.prototype.getEnrollmentCap = function() {
  return 1;
};


/**
 * @return {number}
 */
CourseModel.prototype.getCredits = function() {
  return 1;
};

/**
 * @return {number}
 */
CourseModel.prototype.getDistributionType = function() {
  return this.data_["distributionGroup"];
};


/**
 * @return {number}
 */
CourseModel.prototype.getDistributionOneCredits = function() {
  return 0;
};


/**
 * @return {number}
 */
CourseModel.prototype.getDistributionTwoCredits = function() {
  return 0;
};


/**
 * @return {number}
 */
CourseModel.prototype.getDistributionThreeCredits = function() {
  return 0;
};


/**
 * Returns all sections of the current course (including this one).
 * @return {!Array.<!CourseModel>}
 */
CourseModel.prototype.getAllSections = function() {
  if (this.otherSections_) { // Cache since this calculating this is potentially expensive.
    return this.otherSections_;
  }

  this.otherSections_ = this.coursesModel_.getAllSections(this);
  return this.otherSections_;
};

});  // goog.scope
