/*******************************************************************************
 *
 * A blank reference implementation exists below. Replace it with your
 * implementation.
 *
 *                                                                        [n=80]
 ******************************************************************************/


"use strict";

var _ = require('underscore'),
    Interval = require('./intervals');

var hours = {
    // parse: string -> string
    // read a NL date information and return a properly formatted string.
    parse: function(str){
        return 'S'+
            this.clean(
                this.merge(
                    this.read(
                        this.tag(
                            this.tokenize(str)
                        )
                    )
                )
            )
    },

    rules: {
        // hours are always either HH:MM, H:MM or HHMM
        // interval markers 'to', '-' and '–'
        // splits token are ';', '&' and '\n'
        // for the rest, we need some lexicon
        chinese:{
            '_D6 _ET _D0':['星期六、日'],
            _D0: ['至日','星期日'],
            _D1: ['星期'],
            // TODO: get translation for those.
            // Tuesday
            // Wednesday
            // Thursday
            _D5: ['至五'],
            _D6: ['至六'],
            _INTERVAL: ['\\-','to','–','一'],
            _ET: ['&', '\\band\\b']

        },
        english: {
            // case insensitive, starting with the more discriminatory string each time (so we don't end up with D0day
            _INTERVAL: ['\\-','\\bto\\b','–'],
            _ET: ['&', '\\band\\b'],
            _D0: ['\\bsunday\\b', '\\bsun\\.', '\\bsun\\b'],
            _D1: ['\\bmonday\\b', "\\bmon\\.",'\\bmon\\b'],
            _D2: ['\\btuesday\\b', '\\btue\\.', '\\btue\\b'],
            _D3: ['\\bwednesday\\b', '\\bwed\\..', '\\bwed\\b'],
            _D4: ['\\bthursday\\b', '\\bthur\\.', '\\bthu\\b'],
            _D5: ['\\bfriday\\b', '\\bfri\\.', '\\bfri\\b'],
            _D6: ['\\bsaturday\\b', '\\bsat\\.', '\\bsat\\b'],
            '_D1 _INTERVAL _D5': ['\\bweekday\\b']

        }
    },

    // tokenize: string -> string
    // Replace all datetime information with selected tokens.
    // example: 'Mon-Sun: 12:30-01:00' -> '_D1 _INTERVAL _D0: _T1200 _INTERVAL _T2500'
    // TODO: make language aware, to tackle potential ambiguity, and for arguable efficiency
    tokenize: function(str){
        // First, get all the hours information.
        str = this.tokenize_hours(str);

        // Pretty simple, we loop through all the rules and we str.replace
        var voc = this.rules,
            reg;
        _.each(voc, function(lang){
            _.each(lang, function(rules, tokens){
                _.each(rules, function(rule){
                    reg = new RegExp(rule, 'ig');
                    str = str.replace(reg, " "+tokens+" ");
                })
            })
        });

        str = str.replace(/\b[^_][A-Z]*\b/gi, ''); // remove everything that is not a token
        str = str.replace(/[^A-Z_0-9 ]/g,"");
        return str.replace(/\s+/g, ' '); // remove multiple space, because it's prettier.
    },

    // tag: string -> string
    // tag a tokenize string. for example: _D1 _INTERVAL _D4 _ET _D0 : _T0930 _INTERVAL _T2230
    // will become DATETIMES_BEGIN DATE_BEGIN _D1 _INTERVAL _D4 _ET _D0 DATE_END : TIME_BEGIN_T0930 _INTERVAL _T2230 TIME_END DATETIMES_END
    tag: function(str){

        var re; // Regular expression

        // 1. tag date and time
        re = new RegExp('(_T[0-9]+(.*?)_INTERVAL(.*?)_T[0-9]+)', 'gi');
        str = str.replace(re, " TIME_BEGIN $1 TIME_END ");

        re = new RegExp("(_D[0-6](.*?)) TIME_BEGIN", 'gi');
        str = str.replace(re, ' DATE_BEGIN $1 DATE_END TIME_BEGIN ');

        // 2. group date and time(s) together.
        // a DATETIME is a sequence of a DATE and one or more TIMEs
        re = new RegExp(/(DATE_BEGIN.*?DATE_END(\s*TIME_BEGIN.*?TIME_END\s*)+)/g);

        str = str.replace(re, " DATETIMES_BEGIN $1 DATETIMES_END");

        return str.replace(/\s+/g, ' '); // remove multiple space, because it's prettier.
    },


    // read: string -> Array
    // Read the tagged string and extract all time information
    // output an object of { date: [time] }
    read: function(str){
        var results = {};
        var datetimes = str.match(/DATETIMES_BEGIN(.*?)DATETIMES_END/g);
        var date;
        var times;
        var formatted_times;
        var self=this;

        _.each(datetimes, function(dt){
            date = dt.match(/DATE_BEGIN(.*)DATE_END/g); // no need to prevent gluttony, only one BEGIN/END possible
            date = date[0].replace(/DATE_BEGIN(.*)DATE_END/g, "$1");

            date = self.clean_dates(date);

            times = dt.match(/TIME_BEGIN(.*?)TIME_END/g); // though here we do, ? is mandatory.

            formatted_times = [] ;
            _.each(times, function(t){
                formatted_times.push(self.clean_times(t));
            });
            if(!results[date]){
                results[date] = [];
            }

            results[date] = results[date].concat(formatted_times);
        });

        return results;
    },

    // merge: Array -> string
    // Make sense out of the output of the tagger, factorize what needs to be factorized.
    merge: function(values){

        var result = {}, tmp = []; // store the different manipulations on the data.
        var dates,intervals;
        var substitution = false; // boolean flag.

        // Merge time intervals
        _.each(values, function(times, date){
            result[date] = Interval.merge(times, true);
        });

        // The dreaded breakfast case
        // cascade global values to smaller intervals
        // 0-4 will inherit the values of 0-6. We substract 0-4 from the 0-6 range (getting 5-6)
        // then repeat.
        dates = _.keys(result);

        _.each(dates, function(inter1, index1){
            _.each(dates, function(inter2, index2){
                substitution = false;
                if(index1 !== index2 && result[inter2]){
                    if(Interval.isin(Interval.str2intervals(inter1)[0], Interval.str2intervals(inter2)[0])){
                        substitution = true;
                        result[inter1] = result[inter1].concat(result[inter2]);
                        // split the previous interval to account for the copy and avoid duplicated content.
                        intervals = Interval.intervals2str(Interval.substract(Interval.str2intervals(inter2)[0], Interval.str2intervals(inter1)[0]));
                        if(result[intervals]){
                            result[intervals] = result[intervals].concat(result[inter2]);
                        } else {
                            result[intervals] = result[inter2];
                        }
                    }
                }
                if(substitution){
                    delete result[inter2];
                }
            })
        });

        // case ''Fri-Sat: 0000-2300, Mon: 0000-2300'' -> merge days with the same schedule.
        // simplest is to do a string comparison
        _.each(result, function(v, k){

            result[k] = Interval.intervals2str(result[k]);


        });

        _.each(result, function(v,k){
            _.each(result, function(v2,k2){
                if(k!==k2 && result[k] && result[k2]){
                    if(v == v2){
                        var key = k+','+k2;
                        result[key] = v; // roughly group the interval, there is a cleaning pass afterwards anyway.
                        delete result[k];
                        delete result[k2];
                    }
                }
            })
        });

        _.each(_.keys(result), function(k){
            if(result[k]){
                tmp.push({
                    // make sure the final result is normalized, sorted and everything.
                    date: Interval.intervals2str(Interval.normalize(Interval.merge(Interval.str2intervals(k), true))),
                    times: Interval.normalize(Interval.merge(Interval.str2intervals(result[k]), true))
                });
            }
        });

        // Here is a good place to change the order of different date/time before the final display.
        result = _.sortBy(tmp, function(datetime){
            return Interval.min(Interval.str2intervals(datetime.date))
        });

        return result;
    },

    // clean: Array -> string
    // format to the expected string
    clean: function(values){
        var results = [], self = this, str_time, a_time;
        var date,times;

        _.each(values, function(datetime){
            times = datetime.times;
            date = datetime.date;
            a_time = [];
            _.each(times, function(t){
                t[0] = t[0].toString();
                t[1] = t[1].toString();
                while(t[0].length < 4){ t[0] = "0"+t[0]; } // 0 padding
                while(t[1].length < 4){ t[1] = "0"+t[1]; }
                a_time.push(t.join('-'));
            });
            results.push(date+':'+a_time.join(','));
        });

        return results.join(';');
    },


    /* **********************************************************************
        Miscellaneous helper methods.
     * ******************************************************************** */
    // Detect and tokenize hours.
    // pretty simple, but can be seriously improved to cover more  more hour formats.
    tokenize_hours: function(str){
        str = str.replace(/([0-9]?[0-9]):?([0-9][0-9])/g, "_T$1$2");
        // if time is HMM, transform it to 0HMM
        str = str.replace(/_T([0-9][0-9][0-9])\b/g, "_T0$1");
        return str;
    },


    // clean_times: str -> Array
    // _T1200 _INTERVAL _T0100 -> [ ['1200', '2500'] ],
    // format times, do some checking
    clean_times: function(t){
        var begin, end, hh;
        t = t.replace(/TIME_BEGIN(.*?)TIME_END/, "$1");
        t = t.replace(/_T/g, "");
        t = t.replace(/\s/g,"");

        begin = t.split('_INTERVAL')[0];
        end = t.split('_INTERVAL')[1];

        // If the end time is before the beginning time, we assume it's past midnight.
        if(parseInt(end,10) < parseInt(begin,10) ){
            hh = end.slice(0,2);

            hh = parseInt(hh)+24;
            end = hh+end.slice(2);
        }

        return [begin, end];
    },

    // clean dates: str -> str
    // _D1 _INTERVAL _D0 -> 0-6
    // _D1 _INTERVAL _D3 _ET D5 -> 1-3,5
    clean_dates: function(date){
        var days = [];
        var begin, end;
        var has_zero = false, has_six = false;
        var result = [];
        var dates;

        date = date.replace(/\s/g, '');
        date = date.replace(/_D/g, '');


        // Split around the AND sign
        dates = date.split('_ET');

        // Process the interval in there.
        _.each(dates, function(d){
            if(d.match('_INTERVAL')){
                begin = d.split('_INTERVAL')[0];
                end = d.split('_INTERVAL')[1];

                // case we cover the full week.
                if(begin - end == 1){
                    days.push([0,6]);
                } else{
                    days.push([begin,end]);
                }
            } else {
                if(d){
                    days.push([d]);
                }
            }
        });

        // merge days in sequence
        days = Interval.merge(days, false);

        // There is one last exception for the days, as 0 follows 6, we need to see if we have a special merge here.
        for(var i = 0 ; i < days.length ; i++){
            if(days[i][0] == 0 && days[i][1] == 0){
                has_zero = i;
            } else if(days[i][1] == 6){
                has_six = i;
            }
            if(has_zero !== false && has_six !== false && has_six !== has_zero){
                days[has_zero][0] = 6;
                days = days.slice(0,has_six).concat(days.slice(has_six+1));
                break;
            }
        }

        _.each(days, function(interval){
            if(interval[0] == interval[1]){
                result.push(interval[0]);
            } else {
                result.push(interval[0]+'-'+interval[1]);
            }
        });

        return result.join(',');
    }
};

//console.log(hours.parse('Mon.-Sat.: 11:30-14:30, 18:00-22:30; Sun.&Public Holidays: 11:00-14:30, 18:00-22:30'));
//
//console.log(
//    hours.merge(
//        hours.read(
//            hours.tag(
//                hours.tokenize(
//                    'Sun: 700-2300'
//                )
//            )
//        )
//    )
//);
//


module.exports = (function() {
    "use strict";

    return {
        parse: function(str){
            return hours.parse(str);
        }
    };
}());

// That's all folks.