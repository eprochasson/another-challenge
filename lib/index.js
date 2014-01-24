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
        return 'S'+this.merge(
            this.read(
                this.tag(
                    this.tokenize(str)
                )
            )
        );
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
        // First, tag all the hours information.
        str = str.replace(new RegExp('([0-9]?[0-9]):?([0-9][0-9])','g'), "_T$1$2");

        // Pretty simple, we loop through all the rules and we str.replace
        // could it be optimized? Probably. Does it matter? No, str.replace is efficient
        var voc = this.rules,
            reg;
        _.each(_.keys(voc), function(lang){
            _.each(_.keys(voc[lang]), function(tokens){
                _.each(_.keys(voc[lang][tokens]), function(token){
                    reg = new RegExp(voc[lang][tokens][token], 'ig');
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
    // Read the string and extract all time information
    // output an object of { date: [time] }
    // for example, Sun: 12:00-13:00, Weekdays: 1000:1200, 1300:1500 will return
    //      { 0 : ['1200:1300'], 1-5: ['1000:1200', '13:1500'] }
    read: function(str){
        var results = {};
        var datetimes = str.match(/DATETIMES_BEGIN(.*?)DATETIMES_END/g);
        var date;
        var times;
        _.each(datetimes, function(dt){
            date = dt.match(/DATE_BEGIN(.*)DATE_END/g); // no need to prevent gluttony, only one BEGIN/END possible
            date = date[0].replace(/DATE_BEGIN(.*)DATE_END/g, "$1");
            times = dt.match(/TIME_BEGIN(.*?)TIME_END/g); // though here we do, ? is mandatory.

            _.each(times, function(t){
                t = t.replace(/TIME_BEGIN(.*?)TIME_END/, "$1");

                if(results[date]){
                    results[date].push(t);
                } else {
                    results[date] = [t];
                }
            })
        });
        return results;
    },
    // merge: Array -> string
    // Make sense out of the output of read, factorize what needs to be factorize and format to the final result.
    merge: function(){
        var result = '';
    }
};



var examples = [
    'Sunday: 7:00 to 11:00',
    'Mon-Sun: 12:30-01:00',
    'Mon-Thu & Sun: 09:30-22:30',
    'Mon-Sun\nBreakfast 07:00-11:00\nLunch 11:30-14:30\nTea 14:00-18:00\nSun-Thu Dinner 18:30-22:30\nFri & Sat Dinner 18:30-23:30'
];

var e ;
_.each(examples, function(str){
    console.log(str);
    console.log(hours.read(hours.tag(hours.tokenize(str))));
});



module.exports = (function() {
    "use strict";

    return {
        parse: function(str){
            return hours.parse(str);
        }
    };
}());

