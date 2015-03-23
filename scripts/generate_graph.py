# Manuele Cavalli-Sforza
# 2014-09-12
# https://github.com/ManniCS/civet

"""This script takes the number of a changelist as an argument. Please note that this does not check that the files in the 
   changelist are actually Objective-C files. Behavior is currently undefined if the files in the changelist are not only 
   Objective-C files. As currently written, the file also depends upon the files in the changelist being in the same directory 
   as this script. 
   
   This file is more a proof of concept than a robustly functional piece of the implementation."""

import sys
import subprocess
import os

"""Grab the changelist number from the command line."""
if len(sys.argv) < 1: 
    print "Please enter a valid changelist number as the argument to this script."
    sys.exit()

changelist_number = -1
valid_num_found = False

for i in xrange(1, len(sys.argv)):
    f = sys.argv[i]
    if f.isdigit(): 
        changelist_number = f
        valid_num_found = True

if not valid_num_found: 
    print "Please enter a valid changelist number as the argument to this script."
    sys.exit()

"""Script wide variables"""
diffed_files = "test_output_from_diffs.txt" #"diffed_files.txt"
dot_output_file = "graph.dot"
json_output_file = "graph.json"
reduced_json_out_file = "graph._json"
index_file = "test.html"

"""Execute p4 commands to retrieve files associated with given changelist number."""
# subprocess.call("p4 files @=" + str(changelist_number) +  " | sed s/#.*// | sed s/.depot.// > " + diffed_files, shell=True) #stdout=subprocess.PIPE

"""Kill any existing google chrome processes. #This allows you to shift focus to the chrome window when you later open the file in it."""
subprocess.call("killall 'Google Chrome'", shell=True)

"""Run objc_dep.py on codebase"""
subprocess.call("python objc_dep.py SecureTextMessaging > " + dot_output_file, shell=True)

"""Run dot_to_json.py"""
subprocess.call("python dot_to_json.py " + dot_output_file + " " + json_output_file, shell=True)

"""Run dataset_reduce.py to grab smaller subset of nodes & edges"""
subprocess.call("python dataset_reduce.py " + diffed_files + " " + json_output_file + " " + reduced_json_out_file, shell=True)

"""Open google chrome"""
subprocess.call("open -a 'Google Chrome' --args " + os.getcwd() + "/" + index_file + " -allow-file-access-from-files", shell=True)

#reimplement with PIPEs(?)
#next_line = "!"
#while next_line: 
#    next_line = p.stdout.readline()
#    print "hey!"
#    print next_line
