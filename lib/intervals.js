/*************************************************************************
 * Interval manipulation. Really tailored for the day/time manipulation, *
 * pretty lame for the general case.                                     *
 *************************************************************************/

var _ = require('underscore');

var interval = {

    // interval2str: Array -> string
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
    // margin stands for the minimum distance to consider that two interval overlaps
    // margin == 1 -> [0,2],[3,4] overlap
    // margin == 0 -> [0,2],[3,4] do not overlap.
    overlap : function(int1, int2, margin){
        margin = margin ? margin : 0;
        return (int1[1]+margin >= int2[0]) && (int1[0] <= int2[1]+margin)
    },

    // merge two intervals. Very naive, wanna make sure they overlap first.
    domerge : function(int1, int2){
        return [Math.min(int1[0], int2[0]), Math.max(int1[1], int2[1])];
    },

    // int1 is contained in int2?
    isin: function(int1, int2){

        return int1[0] <= int1[1] && int2[0] <= int2[1] && int1[0] >= int2[0] && int1[1] <= int2[1]
    },

    // substract inter2 from inter1
    // 1. [0, 6], [0, 3] -> [[4,6]]
    // 2. [0, 6], [4, 6] -> [[0, 3]]
    // 3. [0, 6], [4, 7] -> [[0, 3]]
    // 4. [0, 6], [2, 3] -> [[0,1], [4,6]
    // 5. [0,6], [0,6] -> []
    substract: function(inter1, inter2){

        inter1[0] = parseInt(inter1[0]);
        inter1[1] = parseInt(inter1[1]);
        inter2[0] = parseInt(inter2[0]);
        inter2[1] = parseInt(inter2[1]);

        if(!this.overlap(inter1, inter2)){
            return inter1; // no overlap, do nothing
        }
        if(inter1[0] >= inter2[0]){
            if(inter1[1] <= inter2[1]){
                return []; // case 5
            }
            return [[inter2[1]+1, inter1[1]]];// case 1
        } else if(inter1[1] <= inter2[1]){ // case 2
            return [[inter1[0], inter2[0] - 1]];
        } else { // case 4.
            return [[inter1[0], inter2[0]-1], [inter2[1]+1, inter1[1]]]
        }
    },

    // a generic method to merge/sort a set of intervals/values. Used for both days and time.
    // "exclude" indicates if we joined neighbour interval or actually overlapping ones.
    // [ [0,2], [4], [5] ] -> [ [0,2], [4,5] ]
    // [ [0,2], [3], [5] ] -> [ [0,3], [5] ]
    // Wall of text, but it is actually quite simple.
    // Complexity could be improved.
    merge: function(intervals, exclude){
        var self = this;
        var results = [], final_result = [];
        var inserted ;
        var current_interval ;
        var pos, max;
        var margin = !exclude ? 1 : 0;

        if(exclude === undefined){ exclude = true ;}

        // Loop through each intervals. If they can be inserted into an interval already process, great
        // if we can't, just insert it.
        _.each(intervals, function(interval){
            if(interval.length == 1){ // insertion of single value
                interval = [parseInt(interval[0]), parseInt(interval[0])]; // transform it into a doublet.
            } else {
                interval = [parseInt(interval[0]), parseInt(interval[1])];
            }

            if(results.length == 0){ // first iteration.
                results.push(interval);
            } else {
                inserted = false;
                for(var i = 0 ; i < results.length ; i++ ){
                    current_interval = results[i];
                    // if we have an overlap, we merge
                    if(self.overlap(current_interval, interval, margin)){
                        results[i] = self.domerge(current_interval, interval);
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
                    results[pos] = self.domerge(results[i], results[pos]); // Merge with the previous interval
                    max = results[i][1] > max ? results[i][1] : max; // update the max
                    results[i] = null; // kill the current, useless value.
                } else {
                    pos = i; // if we were to merge, we'd merge with this one.
                    max = results[i][1];
                }
            } else {
                max = results[0][1];
                pos = 0;
            } // else: first case, nothing to compare.
        }

        // final cleaning
        _.each(results, function(r){
            if(r !== null){
                final_result.push(r)
            }
        });
        return final_result;
    },

    // sum the width of a set of intervals
    // [ [0,1], [2], [5,6] ] -> 5 (singletons count as 1)
    // again, very tailored for the case of days counting.
    // (unused).
    width: function(intervals){
        var sum = 0;
        _.each(intervals, function(interval){
            if(interval[0] <= interval[1] )
            sum += intervals[1] - intervals[0] + 1
        });

        return sum;
    }
};



module.exports = (function() {
    "use strict";

    return interval;
}());

