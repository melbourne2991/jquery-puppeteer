# Caveats
If using babel or typescript and targetting ES5 anonymous functions will end up being stringified to `function() {}`. Chrome does not allow unnamed
anonymous functions that are not assigned to a variable so you will need to either use a named function or pass in a string instead.