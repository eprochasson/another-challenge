# Report on the kite-challenge

Completion time: around 11 hours.

## Tests

All test are clear except for two (actually the same one, in English and Chinese):
`Mon.-Fri.: 12:00-14:30； 18:00-22:30
Sat.-Sun.&Public Holidays: 11:30-15:00; 18:00-22:30:`

- expected: S6-0:1130-1500,1800-2230;1-5:1200-1430,1800-2230
- actual: S1-5:1200-1430,1800-2230;6-0:1130-1500,1800-2230

The two solutions are pretty much equivalent and, without further instruction, I wouldn't know how to privilege one on
the other. I would actually argue that my output is better since it places the largest interval of days first (Monday -
Friday, then Saturday & Sunday). At the end, it would be a minor change, given the logic for it.

(some more added test fail, they are discussed later).

## Architecture

There are five main stage in the process.

### Tokenize (method `tokenize`)

We mark all date/time information using simple rules for English and Chinese (in this case, the rule for Chinese are not
the greatest, I wish I could speak Chinese). Additional language can be easily added. The tokenizing process uses all
rules everytime. On larger corpora, making language aware could be an improvement (so we don't apply Chinese rules to an
English document.

### Tagging (`tag`)

The tokenized text is then tagged to regroup the different date/time information. We first group the hours interval, the
day interval, then the set of days interval + hours interval(s).

### Parsing (`read`)

The tagged text is then parsed to build a associative array of days -> time(s) information. This is the last step to
move from text to a data structure easy to manipulate.

### Merge (`merge`)

This step cleans the data, factorize what needs to be factorized
(`Fri-Sat: 0000-2300, Mon: 0000-2300` -> `Monday, Friday to Saturday : 0000 to 2300`). In other word, it does all the
data manipulation to return consistently encoded date/time.

### Clean (`clean`)

Format the data into the final string.

## Pros and Cons

### Modularity

The goal here is to have a very modular processing stream, where pieces can be improved independently (typically, adding
more rules to match more date/time information). Each brick in the process just passed information to the next one.

### What can be improved

The interval manipulation has been overlooked at first and could benefit from serious improvement (the complexity of the
merge operation is sub-optimal). I'm quite happy with the 5 steps but for the `merge`, that implements custom time
manipulation rules. I guess with time and more understanding it could be made more logical (and cleaner, and leaner). It
could also benefit from its own test coverage and refactoring (say, detecting the type of the values and doing the
string to intervals conversion automatically).

The tokenizer/tagger/parser are not error-proof. They make a heavy usage of regular expression and no exceptions are
really handled (meaning the output of the tagger might crash the parser).


## The extra mile.

I added one test when closing time is after 2800. If a shop closes __before__ it opens, we consider it is the next
day (and add 24 hours to its closing time). That would not really cover the case of a bar opening after midnight on a
Saturday to Sunday night (it will be parsed as opening very early on Saturday morning). However, if it's a fishmonger
market, chances are they really mean to open very early in the morning. As usual in NLP, additional information (type
of the shop for example) gives more clue on how to process them.

