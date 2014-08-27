"""Understanding this file will be aided by understanding the dot_to_json.py 
   file, the output of which this file operates on. Takes a list of diffed files
   and a json file describing dependency relationships in the corresponding code 
   base and spits out a reduced json file containing node and link information for
   the nodes representing the diffed files, their immediate children.""" 

import json
import sys

"""Grab input and ouput files from the command line"""
input_file, output_file, diffed_file = "", "", ""

if len(sys.argv) < 3: 
	print "Please enter a diffed file, an input file, and an output file, ending in a .txt, .json and ._json extension, respectively"
	sys.exit()

found_input_file = False
found_output_file = False
found_diffed_file = False

for i in xrange(1, len(sys.argv)):
	f = sys.argv[i]
	if '.txt' in f: 
		diffed_file = f
		found_diffed_file = True
	if '.json' in f: 
		found_input_file = True
		input_file = f
	if '._json' in f: 
		found_output_file = True
		output_file = f

if not (found_output_file and found_input_file and diffed_file): 
	print "Please enter a diffed file, an input file, and an output file, ending in a .txt, .json and ._json extension, respectively"
	sys.exit()

"""Load json object into a python variable."""
dataset = json.load(open(input_file, "r"))
diffed_file = open(diffed_file, "r")
output_file = open(output_file, "w")

"""Set up necessary script-wide variables"""
index = 0
child_index = 0
diffed_files = []
discovered_nodes = {} # dictionary of discovered nodes: these have already been given,
				  	  # and are stored with, their unique index (the values of the dict)
nodes = dataset["nodes"] #array of JSON objects = loaded nodes
links = dataset["links"] #array of JSON objects = loaded edges

reduced_nodes = []#array of JSON objects representing the reduced set of nodes necessary 
				  #for initializing the force-directed layout in test.html
reduced_links = []#array of JSON objects representing the reduced set of links necessary 
				  #for initializing the force-directed layout in test.html
child_nodes = [] #the children of the loaded nodes

"""Setup helper functions"""
def childWithName(name):
	for elem in nodes: 
		if elem["name"] == name: return elem

"""Grab list of diffed files from the diffed file"""
next_line = "!"
while next_line != "":
	next_line = diffed_file.readline()
	next_line = next_line.strip()
	#next_line = next_line[0:len(next_line) - 2]
	if next_line:
		print next_line
		diffed_files.append(next_line)

print "*************************"

"""Add the JSON objects corresponding to the files in the list of diffed files
   to the reduced collection of nodes, giving each object a unique id."""
for elem in nodes: 
	# print elem["name"]
	if elem["name"] in diffed_files:
		print "Hey, I found one!"
		discovered_nodes[elem["name"]] = index
		elem["_originalNode"] = True #indicate this element is one of the original nodes
		reduced_nodes.append(elem)
		index += 1

print reduced_nodes

"""Add the files dependent on the diffed files (their children) to the collection
   of reduced nodes, and their links to the set of reduced links."""
for elem in reduced_nodes: 
	# print elem["name"]
	parent_index = discovered_nodes[elem["name"]]
	for child in elem["_children"]:
		print child
		if child in discovered_nodes:
			child_indx = discovered_nodes[child]
			reduced_links.append({"source": parent_index, "target": child_indx})
		else: 
			child_indx = len(reduced_nodes) + child_index #zero indexed (bc child index starts at 0)
			discovered_nodes[child] = child_indx
			child_nodes.append(childWithName(child))
			reduced_links.append({"source": parent_index, "target": child_indx})
			child_index += 1

"""Toggle all diffed file nodes to have expanded children"""
for elem in reduced_nodes:
	elem["children"] = elem["_children"]
	elem["_children"] = False

"""Assemble and write the final object to a file"""
final_object = {"nodes": reduced_nodes + child_nodes, "links": reduced_links}

output_file.write(json.dumps(final_object))
