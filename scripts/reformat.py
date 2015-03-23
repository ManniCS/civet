# Manuele Cavalli-Sforza
# 2014-09-12
# https://github.com/ManniCS/civet

import sys

# """Grab input and ouput files from the command line"""
if len(sys.argv) < 1: 
    print "Please enter an input file."
    sys.exit()

found_input_file = False
input_file = ""

for i in xrange(1, len(sys.argv)):
    f = sys.argv[i]
    if '.json' in f: 
        found_input_file = True
        input_file = f
    elif '._json' in f:
        found_input_file = True
        input_file = f

if not found_input_file: 
    print "Please enter an input file with a .json or ._json extension"
    sys.exit()

f = open(input_file, "r")

output_string = ""
new_line = "!"
while new_line != "":
    new_line = f.readline()
    new_line = new_line.replace('{"parents":', '\n{"parents":') #changed because properties are reverse alphabetically ordered in dumb, meaning parents appears first now, as opposed to "name"
    new_line = new_line.replace('"links":', '\n"links":')
    output_string += new_line.replace('{"source":', '\n{"source":')

f.close()
o = open(input_file, "w")

o.write(output_string)
