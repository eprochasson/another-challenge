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
        return 'S'+this.clean(this.read(this.tag(str)));
    },

    // tag: string -> string
    // Replace all datetime information with selected tokens.
    // example: 'Mon-Sun: 12:30-01:00' -> '_D1 _INTERVAL _D0: _T1200 _INTERVAL _T2500'
    // TODO: make language aware, to tackle potential ambiguity, and also for efficiency
    tag: function(str){
        // First, tag all the hours information.
        str = str.replace(new RegExp('([0-9]?[0-9]):?([0-9][0-9])','g'), function(nil, p1, p2){ return '_T'+p1+p2});

        // Pretty simple, we loop through all the rules and we abuse str.replace
        // could it be optimized? Probably. Does it matter? No, str.replace is efficient
        var voc = this.vocabulary,
            reg;
        _.each(_.keys(voc), function(lang){
            _.each(_.keys(voc[lang]), function(tokens){
                _.each(_.keys(voc[lang][tokens]), function(token){
                    reg = new RegExp(voc[lang][tokens][token], 'ig');
                    str = str.replace(reg, " "+tokens+" ");
                })
            })
        });

        return str.replace(/\s+/g, ' '); // remove multiple space, because it's prettier.
    },

    // read: string -> Array
    // Read the string and extract all time information
    // output an object of { date: [time] }
    // for example, Sun: 12:00-13:00, Weekdays: 1000:1200, 1300:1500 will return
    //      { 0 : ['1200:1300'], 1-5: ['1000:1200', '13:1500'] }
    read: function(str){

    },
    // clean: Array -> string
    // Make sense out of the output of read, factorize what needs to be factorize and format to the final result.
    clean: function(){

    },
    vocabulary: {
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
            _D6: ['至六']
        },
        english: {
            // case insensitive, starting with the more discriminatory string each time
            // some can be simplified if we really want to stick to the tests only, but it's a silly optimization
            _D0: ['sunday', 'sun\\.', 'sun'],
            _D1: ['monday', "mon\\.",'mon'],
            _D2: ['tuesday', 'tue\\.', 'tue'],
            _D3: ['wednesday', 'wed\\.', 'wed'],
            _D4: ['thursday', 'thu\\.', 'thu'],
            _D5: ['friday', 'fri\\.', 'fri'],
            _D6: ['saturday', 'sat\\.', 'sat'],
            _INTERVAL: ['\\-','to','–'],
            _ET: ['&', 'and']

        }
    }
};



var examples = [
    'Sunday: 7:00 to 11:00',
    'Mon-Sun: 12:30-01:00',
    'Mon-Thu & Sun: 09:30-22:30'
];

_.each(examples, function(str){
    console.log(str);
    console.log(hours.tag(str));
});



module.exports = (function() {
    "use strict";

    return {
        parse: function(str){
            return hours.parse(str);
        }
    };

}());

