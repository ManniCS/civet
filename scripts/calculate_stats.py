# Manuele Cavalli-Sforza
# 2014-09-12
# https://github.com/ManniCS/civet

import sys
import collections

# """Grab input and ouput files from the command line"""
if len(sys.argv) < 1: 
    print "Please enter an input file."
    sys.exit()

found_input_file = False
input_file = ""

for i in xrange(1, len(sys.argv)):
    f = sys.argv[i]
    if '.dot' in f: 
        found_input_file = True
        input_file = f

if not found_input_file: 
    print "Please enter an input file with a .dot extension"
    sys.exit()

stats = {}

def includeInCalculations (tokens):
    if len(tokens) <= 1: #if there is only one token left on the line
        return           #return

    """Add nodes to collection as child and parent"""
    parent = tokens[len(tokens) - 1]
    child = tokens[len(tokens) - 2]

    if (child == "{}"): return #a possible way of encoding no children (obviously, 
                               #we don't want this to be included as a child node)

    """Check if parent exists. If it does, simply add one to its total. If not 
       add it to the structure and initialize it with a total of 1"""
    if parent in stats:
        stats[parent] = stats[parent] + 1
    else:
        stats[parent] = 1

    """Recursively call the method on the rest of the tokens"""
    includeInCalculations(tokens[0:-1])

"""Parse file"""
f = open(input_file, "r")

next_line = "!"
while next_line != "":
    next_line = f.readline()
    """If line does not contain edge information, skip"""
    if not '->' in next_line:
        continue;

    """Format string for splitting"""
    next_line = next_line.replace(" ", "") #remove white space
    next_line = next_line.replace('"', "") #remove quote-marks
    next_line = next_line.strip() #remove trailing,leading whitespace
    next_line = next_line.replace(";", "") #remove semicolon

    """Split string"""
    tokens = next_line.split("->") #split line on arrows

    """Recursively adds nodes and links from a coded link information
    to the respective datastructures"""
    includeInCalculations(tokens)

summary = {}
for elem in stats:
    if stats[elem] in summary:
        summary[stats[elem]].append(elem)
    else: 
        summary[stats[elem]] = [elem]

printable = collections.OrderedDict(sorted(summary.items()))

o = open(input_file[:-4] + "_stats.txt", "w")

prev_elem = ""

for elem in printable:
    o.write(str(elem) + " # " + str(printable[elem]) + '\n')
    if prev_elem != "" and prev_elem != (elem - 1):
        for i in xrange(prev_elem + 1, elem):
            o.write(str(i) + " # " + '\n')

o.close()
f.close()


