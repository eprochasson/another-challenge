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
            ));
    },

    rules: {
        // hours are always either HH:MM, H:MM or HHMM
        // interval markers 'to', '-' and '–'
        // splits token are ';', '&' and '\n'
        // for the rest, we need some lexicon
        chinese:{
            _D0: ['至日'],
            _D1: ['星期'],
            // TODO: get translation for those.
//                Tuesday
//                Wednesday
//                Thursday
            _D5: ['至五'],
            _D6: ['至六'],
            _INTERVAL: ['\\-','to','–'],
            _ET: ['&', 'and']

        },
        english: {
            // case insensitive, starting with the more discriminatory string each time (so we don't end up with D0day
            _D0: ['sunday', 'sun\\.', 'sun'],
            _D1: ['monday', "mon\\.",'mon'],
            _D2: ['tuesday', 'tue\\.', 'tue'],
            _D3: ['wednesday', 'wed\\.', 'wed'],
            _D4: ['thursday', 'thu\\.', 'thu'],
            _D5: ['friday', 'fri\\.', 'fri'],
            _D6: ['saturday', 'sat\\.', 'sat'],
            _INTERVAL: ['\\-','to','–'],
            _ET: ['&', 'and'],
            '_D1 _INTERVAL _D5': ['weekdays']

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
            results[date] = self.merge_intervals(formatted_times);
        });

        return results;
    },

    // merge: Array -> string
    // Make sense out of the output of the tagger, factorize what needs to be factorized.
    merge: function(values){

        var result = values;


        // We need to merge:
        // 1. different days with the same times



        return result;
    },


    // clean: Array -> string
    // remove token and format to the expected result.
    clean: function(values){

        var results = [], self = this, str_time, a_time;


        _.each(values, function(times, date){
            console.log('++++++++++++++++++++++', times, date);
            a_time = [];
            _.each(times, function(t){
                console.log(t);
                if(t[0].length < 4){ t[0] = "0"+t[0]; }
                if(t[1].length < 4){ t[1] = "0"+t[1]; }
                a_time.push(t.join('-'));
            });
            console.log('atime',a_time);
        });

        return results.join(',');

    },


    /*
     Some miscellaneous methods.
     */

    // Detect and tokenize hours.
    // pretty simple, but can be changed for more hour formats.
    tokenize_hours: function(str){
        str = str.replace(/([0-9]?[0-9]):?([0-9][0-9])/g, "_T$1$2");
        // quick particular case, if time is HMM, transform it to 0HMM
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

            switch(hh){
                case '00':
                    hh = 24;
                    break;
                case '01':
                    hh = 25;
                    break;
                case '02':
                    hh = 26;
                    break;
                case '03':
                    hh = 27;
                    break;
                case '04':
                    hh = 28;
                    break;
                default:
            }
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
        var result = [];

        date = date.replace(/\s/g, '');
        date = date.replace(/_D/g, '');


        dates = date.split('_ET');

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
                days.push([d]);

            }
        });

        // merge days in sequence
        days = this.merge_intervals(days);

        _.each(days, function(interval){
            if(interval[0] == interval[1]){
                result.push(interval[0]);
            } else {
                result.push(interval[0]+'-'+interval[1]);
            }
        });

        return result.join(',');
    },

    // a generic method to merge/sort a set of intervals/values. Used for both days and time.
    // [ [0,2], [4], [5] ] -> [ ["0-2"], ["4-5"] ]
    // [ [0,2], [3], [5] ] -> [ ["0-3"], ["5"] ]
    merge_intervals: function(intervals){

        var results = [], final_result = [];
        var inserted ;
        var current_interval ;
        var pos, max;

        // tells us if two interval overlaps.
        // note that this is for our particular case, where we consider that [0,3],[4,5] overlap (and should be merged)
        var overlaps = function(int1, int2){
            return (int1[1]+1 >= int2[0]) && (int1[0] <= int2[1]+1)
        };

        // merge two intervals
        var merge = function(int1, int2){
            return [Math.min(int1[0], int2[0]), Math.max(int1[1], int2[1])];
        };

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
                    if(overlaps(current_interval, interval)){
                        results[i] = merge(current_interval, interval);
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
                if(results[i][0] <= max+1){
                    results[pos] = merge(results[i], results[pos]); // Merge with the previous interval
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

var intervals = [
 [ '1130', '1430' ]
]




var examples = [
    'Sunday: 7:00 to 11:00',
    'Mon-Sun: 12:30-01:00',
    'Mon-Thu & Sun: 09:30-22:30',
    'Mon-Sun\nBreakfast 07:00-11:00\nLunch 11:30-14:30\nTea 14:00-18:00\nSun-Thu Dinner 18:30-22:30\nFri & Sat Dinner 18:30-23:30',
//    'Restaurant Mon-Sun: 06:30-23:00\nBar Mon-Sun: 15:00-00:00\nBe on Canton Mon-Sun: 12:00-00:00'  ,
//    'Sunday: 15:00 to 1:00',
//    'Sun: 07:00-00:00',
//    'Mon-Sun: 12:30-01:00'
//    , 'Mon to Sun: 06:30 - 22:30'
//    , 'Fri to Tue: 06:30 - 22:30'
//    , 'Mon - Wed: 07:00-01:00',
//    'Mon-Thu & Sun: 09:30-22:30'
//    , 'Fri-Sat & PH: 09:30-23:00','Mon-Fri: 11:45-16:30; 17:45-23:30'
//    , 'Monday to Sunday: 12:00-15:00, 18:00-22:00','Mon：18:00-00:00'
//    , 'Sat & Sun: 12:00-14:30；18:00-23:00'
//    , 'Mon to Fri: 6:30 – 20:30',
//    'Mon.-Sat.: 11:30-22:30; Sun.: 10:30-22:30'
//    , 'Sun.-Thur. 11:00-23:00, Fri.-Sat. 11:00-00:00',
//    'Mon-Sun\nBreakfast 07:00-11:00\nLunch 11:30-14:30\nTea 14:00-18:00\nSun-Thu Dinner 18:30-22:30\nFri & Sat Dinner 18:30-23:30'
//    , 'Mon-Sun: 06:00-23:00\n(Tea: 06:00-16:00)'
//    , 'Mon-Sat: 11:00-21:00 until 300 quotas soldout'
//    , 'Monday to Sunday & Public Holiday:\n12:00-15:00, 18:00-00:00'
//    , 'Restaurant Mon-Sun: 06:30-23:00\nBar Mon-Sun: 15:00-00:00\nBe on Canton Mon-Sun: 12:00-00:00',
//    'Mon-Sat: 2300-2500,0600-0800'
//    , 'Mon-Sat: 0000-2300,2301-2800'
//    , 'Fri-Sat: 0000-2300, Mon: 0000-2300'
//    , 'Fri-Sat: 0000-2300, Mon: 0000-2301',
//'Mon.-Sun.: 12:00-22:30'
//    , '星期一至日: 12:00-22:30'
//    , 'Mon.-Sat.: 12:00-23:00'
//    , '星期一至六: 12:00-23:00 '
//    , 'Mon.-Sun.: 12:00-14:30, 19:00-22:30'
//    , '星期一至日: 12:00-14:30, 19:00-22:30'
//    , 'Mon to Sat: 12:00 – 14:30; 18:30 – 23:00\nSun: 12:00 – 15:00; 18:30 – 23:00'
//    , '星期一至六：12:00 – 14:30; 18:30 – 23:00\n星期日：12:00 – 15:00; 18:30 – 23:00'
//    , 'Mon.-Fri.: 12:00-14:30； 18:00-22:30\nSat.-Sun.&Public Holidays: 11:30-15:00; 18:00-22:30'
//    , '星期一至五：12:00-14:30； 18:00-22:30\n星期六、日及公眾假期：11:30-15:00； 18:00-22:30'
//    , 'Mon.-Sat.: 11:30-14:30, 18:00-22:30; Sun.&Public Holidays: 11:00-14:30, 18:00-22:30'
//    , '星期一至六: 11:30-14:30, 18:00-22:30; 星期日及公眾假期: 11:00-14:30, 18:00-22:30'
//    , 'Breakfast (Weekday): 07:00-10:00\nBreakfast (Sunday and Public Holiday): 07:00-10:30\nLunch: 12:00-14:30\nDinner: 18:00-22:00\nVerandah Café : 07:00-23:00 (cakes and sandwiches only available from 14:00-18:00 daily)'
//    , '早餐(星期一至六): 07:00-10:00\n早餐(星期日及公眾假期): 07:00-10:30\n午餐: 12:00-14:30\n晚餐: 18:00-22:00\n露台咖啡廳: 07:00-23:00 (糕點及三文治於14:00-18:00供應)'
//    , '星期一至星期日: 07:00-21:00'
]

var e ;
_.each(examples, function(str){
//    console.log(str);
//
//    console.log(
////        hours.clean(
//            hours.merge(
//                hours.read(
//                    hours.tag(
//                        hours.tokenize(str)
//                    )
//                )
//            )
////        )
//    );
});



module.exports = (function() {
    "use strict";

    return {
        parse: function(str){
            return hours.parse(str);
        }
    };
}());

