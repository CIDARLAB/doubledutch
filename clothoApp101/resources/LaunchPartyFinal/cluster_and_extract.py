#!/usr/bin/env python
"""
Cluster and Extract
===================
	Perform hierarchical clustering and try to extract a set number of groups
	based on a standard "centroid" measure of distance. Data supplied as a 
	pairwise distance matrix.
"""

#import csv
#import pylab
import hcluster as sch
import numpy as np
#import matplotlib

__author__  = 'Thomas E. Gorochowski <tom@chofski.co.uk>, Voigt Lab, MIT'
__license__ = 'OSI Non-Profit OSL 3.0'
__version__ = '1.0'

###############################################################################
# OPTIONS
###############################################################################

NUM_TO_SAMPLE = 8



# Options to refine the search
MIN_FAC = 0.01
MAX_FAC = 100.0
FAC_STEPS = 10000

###############################################################################
# RUN THE ANALYSIS
###############################################################################

# Function to find a set number of cluster groups (maximally separated)
# WARNING: this is a hacky function - should use binary type search
def find_groups (L, max_num, score_data):
	fac = 0
	ind = []
	out_groups = []
	found = False
	for fac in np.linspace(MIN_FAC, MAX_FAC, FAC_STEPS):
		#print 'Trying fac =', fac
		ind = sch.fcluster(L, fac*score_data.max(), 'distance')
		#print 'Generated', max(ind), 'groups'
		if max(ind) <= max_num:
			# Found our cut-off
			found = True
			break
	if found == False:
		return None
	else:
		for i in range(max(ind)):
			out_groups.append([])
		for i in range(len(ind)):
			out_groups[ind[i]-1].append(i+1)
	return out_groups, fac

def run(score_data):
    #score data is input array of scores
    #design_num is length of input array
    score_data = np.array(score_data)

    # Generate clustering matrix
    L = sch.linkage(score_data, method='centroid')

    # Sample the groups
    groups, fac = find_groups(L, NUM_TO_SAMPLE, score_data)

    return [{"group":group} for group in groups]


