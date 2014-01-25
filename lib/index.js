/*******************************************************************************
 *
 * A blank reference implementation exists below. Replace it with your
 * implementation.
 *
 *                                                                        [n=80]
 ******************************************************************************/

var _ = require('underscore');

var hours = {
    // parse: string -> string
    // read a NL date information and return a properly formatted string.
    parse: function(str){
        return 'S'+this.clean(
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
//                Tuesday
//                Wednesday
//                Thursday
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

        var result = {}, tmp = {};
        var self = this;
        var dates,intervals;
        var substitution = false;


        // Merge time intervals
        _.each(values, function(times, date){
            result[date] = self.intervals_merge(times, true);
        });

        // The dreaded breakfast case
        // cascade global values to smaller intervals
        // 0-4 will inherit the values of 0-6
        dates = _.keys(result);

        _.each(dates, function(inter1, index1){
            _.each(dates, function(inter2, index2){
                substitution = false;
                if(index1 !== index2 && result[inter2]){

                    if(self.intervals_iscontained(self.str2intervals(inter1)[0], self.str2intervals(inter2)[0])){
                        substitution = true;
                        result[inter1] = result[inter1].concat(result[inter2]);
                        // split the previous interval to account for the copy and avoid duplicated content.
                        intervals = self.intervals2str(self.intervals_substract(self.str2intervals(inter2)[0], self.str2intervals(inter1)[0]));
                        if(result[intervals]){
                            result[intervals] = result[intervals].concat(result[inter2]);
                        } else {
                            result[intervals] = result[inter2];
                        }

                    }
                }
                if(substitution){
                    result[inter2] = null;
                }
            })
        });

        // case ''Fri-Sat: 0000-2300, Mon: 0000-2300'' -> merge days with the same schedule.
        // simplest is to do a string comparison
        _.each(result, function(v, k){
            result[k] = self.intervals2str(result[k]);
        });
        _.each(result, function(v,k){
            _.each(result, function(v2,k2){
                if(k!==k2 && result[k] && result[k2]){
                    if(v == v2){
                        console.log('identical value',v, self.str2intervals(k), self.str2intervals(k2));
                        result[k+','+k2] = v; // roughly group the interval, there is a cleaning pass afterwards anyway.
                        result[k] = null;
                        result[k2] = null
                    }
                }
            })
        });

        // remove the null value.
        _.each(_.keys(result), function(k){
            if(result[k]){
                tmp[k] = self.intervals_merge(self.str2intervals(result[k]), true);
            }
        });

        return tmp;
    },


    // clean: Array -> string
    // format to the expected string
    clean: function(values){
        var results = [], self = this, str_time, a_time;

        _.each(values, function(times, date){
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
     Some miscellaneous methods.
     * ******************************************************************** */

    // Detect and tokenize hours.
    // pretty simple, but can be changed for more hour formats.
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
        if(parseInt(end) < parseInt(begin) ){
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
        days = this.intervals_merge(days, false);

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
    },


    // intervat2str: Array -> string
    // take something like [ [3], [5,6] ] and return "3,5-6"
    intervals2str: function(intervals){
        var a_string = [];
        _.each(intervals, function(interval){
            if(interval.length == 1){
                a_string.push(interval[0]);
            } else {
                a_string.push(interval[0]+'-'+interval[1]);
            }
        });
        return a_string.join(',');
    },

    // str2interval: string -> Array
    // take something like "3,5-6" and return  [ [3], [5,6] ]
    str2intervals: function(str){
        var str_array;
        var results = [];

        str_array = str.split(',');
        _.each(str_array, function(interval){
            results.push(interval.split('-'));
        });

        return results;
    },

    // tells us if two interval overlaps.
    // note that this is for our particular case, where we consider that [0,3],[4,5] overlap (and should be merged)
    intervals_overlap : function(int1, int2, margin){
        margin = margin ? margin : 0;
        return (int1[1]+margin >= int2[0]) && (int1[0] <= int2[1]+margin)
    },

    // merge two intervals
    intervals_domerge : function(int1, int2){
        return [Math.min(int1[0], int2[0]), Math.max(int1[1], int2[1])];
    },


    // int1 is contained in int2?
    intervals_iscontained: function(int1, int2){

        return int1[0] <= int1[1] && int2[0] <= int2[1] && int1[0] >= int2[0] && int1[1] <= int2[1]
    },

    // substract inter2 from inter1
    // 1. [0, 6], [0, 3] -> [[4,6]]
    // 2. [0, 6], [4, 6] -> [[0, 3]]
    // 3. [0, 6], [4, 7] -> [[0, 3]]
    // 4. [0, 6], [2, 3] -> [[0,1], [4,6]
    // 5. [0,6], [0,6] -> []
    intervals_substract: function(inter1, inter2){

        inter1[0] = parseInt(inter1[0]);
        inter1[1] = parseInt(inter1[1]);
        inter2[0] = parseInt(inter2[0]);
        inter2[1] = parseInt(inter2[1]);

        if(!this.intervals_overlap(inter1, inter2)){
            return inter1; // do nothing
        }
        if(inter1[0] >= inter2[0]){
            if(inter1[1] <= inter2[1]){
                return []; // case 5
            }
            return [[inter2[1]+1, inter1[1]]];// case 1
        } else if(inter1[1] <= inter2[1]){ // case 2
            console.log('case 3');
            return [[inter1[0], inter2[0] - 1]];
        } else { // case 4.
            return [[inter1[0], inter2[0]-1], [inter2[1]+1, inter1[1]]]
        }
    },


    // a generic method to merge/sort a set of intervals/values. Used for both days and time.
    // "exclude" indicates if we joined neighbour interval or actually overlapping ones.
    // [ [0,2], [4], [5] ] -> [ ["0-2"], ["4-5"] ]
    // [ [0,2], [3], [5] ] -> [ ["0-3"], ["5"] ]
    intervals_merge: function(intervals, exclude){

        var self = this;
        var results = [], final_result = [];
        var inserted ;
        var current_interval ;
        var pos, max;
        var margin = !exclude ? 1 : 0;

        if(exclude === undefined){ exclude = true ;}


        _.each(intervals, function(interval){
            if(interval.length == 1){ // insertion of single value
                interval = [parseInt(interval[0]), parseInt(interval[0])]; // transform it into a doublet.
            } else {
                interval = [parseInt(interval[0]), parseInt(interval[1])];
            }


            if(results.length == 0){
                results.push(interval);
            } else {
                inserted = false;
                for(var i = 0 ; i < results.length ; i++ ){

                    current_interval = results[i];

                    // if we have an overlap, we merge
                    if(self.intervals_overlap(current_interval, interval, margin)){
                        results[i] = self.intervals_domerge(current_interval, interval);
                        inserted = true;
                        break; // goto++
                    }
                }
                if(!inserted){
                    // otherwise we just push the interval.
                    results.push(interval);
                }
            }
        });

        // In some cases, we'll still have some interval overlap not taken care of in the previous process,
        results = _.sortBy(results, function(n){ return n[0]}); // we sort the intervals, so we guarantee to cover all cases in one search

        pos = 0; max = 0;
        for(var i = 0 ; i < results.length ; i++){
            if(i>0){
                if(results[i][0] <= max+margin){
                    results[pos] = self.intervals_domerge(results[i], results[pos]); // Merge with the previous interval
                    max = results[i][1] > max ? results[i][1] : max; // update the max
                    results[i] = undefined; // kill the current, useless value.
                } else {
                    pos = i; // if we were to merge, we'd merge with this one.
                    max = results[i][1];
                }
            } else {
                max = results[0][1];
                pos = 0;
            }// else: first case, nothing to compare.
        }

        // final cleaning
        _.each(results, function(r){
            if(r !== undefined){
                final_result.push(r)
            }
        });
        return final_result;
    }


};


module.exports = (function() {
    "use strict";

    return {
        parse: function(str){
            return hours.parse(str);
        }
    };
}());

