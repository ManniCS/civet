""" This file parses a dot file and writes the parsed content in 
	json format for graphs, accepted by the d3 force-directed 
	layout. This file assumes that the nodes related by the dot 
	file are filenames that do not contain spaces, and ignores 
	all edge color, and other formatting details, that can be 
	specified in a dot file. 
"""
import json
import sys

input_file, output_file = "", ""

"""Grab input and ouput files from the command line"""
if len(sys.argv) < 2: 
	print "Please enter both an input and an output file, ending in a .dot and .json extension, respectively"
	sys.exit()

found_input_file = False
found_output_file = False

for i in xrange(1, len(sys.argv)):
	f = sys.argv[i]
	if '.dot' in f: 
		found_input_file = True
		input_file = f
	if '.json' in f: 
		found_output_file = True
		output_file = f

if not (found_output_file and found_input_file): 
	print "Please enter both an input and an output file, ending in a .dot and .json extension, respectively"
	sys.exit()

"""Open files"""
f = open(input_file, "r")
o = open(output_file, "w")

"""Set up necessary script-wide variables"""
index = 0
discovered_nodes = {} # dictionary of discovered nodes: these have already been given,
				  	  # and are stored with, their unique index (the values of the dict)
nodes = [] #array of JSON objects representing nodes
links = [] #array of JSON objects representing edges

"""
Recursive method that allows for parsing of lines in the dot 
file that specify relationships between multiple nodes. 
"""
def addNodesAndLinks(tokens):
	if len(tokens) <= 1: #if there is only one token left on the line
		return     		 #return

	"""Bind the appropriate variables to their global equivalents"""
	global index

	"""Add nodes to collection as child and parent"""
	parent = tokens[len(tokens) - 1]
	child = tokens[len(tokens) - 2]

	if (child == "{}"): return #a possible way of encoding no children (obviously, 
							   #we don't want this to be included as a child node)
	"""Add child and parent into collection of discovered nodes, 
	   if not yet discovered and give a unique index"""
	if not parent in discovered_nodes:
		discovered_nodes[parent] = index
		index += 1
	if not child in discovered_nodes:
		discovered_nodes[child] = index
		index += 1

	"""Check if parent and child exist. If they do, simply add child to parent and parent to child"""
	child_exists = False
	parent_exists = False
	for i, elem in enumerate(nodes):
		if elem["name"] == parent:
			parent_exists = True
			nodes[i]["_children"].append(child) #toggle all children as collapsed (in background dataset)
		elif elem["name"] == child:
			child_exists = True
			nodes[i]["parents"].append(parent)

	"""If child or parent do not exist, add the missing ones to the nodes list. 
	   Be sure to push these in this order. This ensures that the node list stays 
	   sorted according to id.

	   Note: Because a node is never added to the list of nodes before it is assigned 
	   the next available unique id (and then inserted into the list of discovered nodes)
	   the ids of the nodes correspond to their index in the final dataset.)"""
	if not parent_exists:
		#print "Adding parent + child!"
		nodes.append({"name": parent, "_children": [child], "parents": []}) 
	if not child_exists:
		#print "Adding child!"
		nodes.append({"name": child, "_children": [], "parents": [parent]})

	"""Add the parent-child relationship to the links list. The discovered nodes 
       dictionary stores information about the ids of the nodes."""
	links.append({"source": discovered_nodes[parent], "target": discovered_nodes[child]})

	"""Recursively call the method on the rest of the tokens"""
	addNodesAndLinks(tokens[0:-1])

"""Parse file"""                                                  
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
	addNodesAndLinks(tokens)

object = {"nodes": nodes, "links": links}

"""Write to file"""
o.write(json.dumps(object))
