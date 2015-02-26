#!/usr/bin/env python
"""
Cluster and Extract
===================
	Perform hierarchical clustering and try to extract a set number of groups
	based on a standard "centroid" measure of distance. Data supplied as a 
	pairwise distance matrix.
"""

import csv
import pylab
import scipy.cluster.hierarchy as sch
import numpy as np
import matplotlib

__author__  = 'Thomas E. Gorochowski <tom@chofski.co.uk>, Voigt Lab, MIT'
__license__ = 'OSI Non-Profit OSL 3.0'
__version__ = '1.0'

###############################################################################
# OPTIONS
###############################################################################

NUM_TO_SAMPLE = 6

DATA_FILENAME = './data/prashant_mux_1424790299850_matrix.txt'
OUTPUT_PREFIX = './results/prashant_mux_'

#DATA_FILENAME = './data/lauren_0x21_1424460866014_matrix.txt'
#OUTPUT_PREFIX = './results/lauren_0x21_'

#DATA_FILENAME = './data/lauren_0x81_1424702768568_matrix.txt'
#OUTPUT_PREFIX = './results/lauren_0x81_'

#DATA_FILENAME = './data/lauren_majority_1424719497216_matrix.txt'
#OUTPUT_PREFIX = './results/lauren_majority_'

#DATA_FILENAME = './data/lauren_pAB9_all_matrix.txt'
#OUTPUT_PREFIX = './results/lauren_pAB9_all_'

# Options to refine the search
MIN_FAC = 0.01
MAX_FAC = 100.0
FAC_STEPS = 10000

###############################################################################
# RUN THE ANALYSIS
###############################################################################

# Load data file
score_data = []
data_reader = csv.reader(open(DATA_FILENAME, 'rU'), delimiter='\t')
header = next(data_reader)
design_num = 1
for row in data_reader:
	if len(row) > 1:
		score_data.append([float(x) for x in row[1:-1]])
		design_num += 1
score_data = np.array(score_data)
designs = range(1, design_num)

# Generate clustering matrix
L = sch.linkage(score_data, method='centroid')

# Function to find a set number of cluster groups (maximally separated)
# WARNING: this is a hacky function - should use binary type search
def find_groups (L, max_num):
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

# Sample the groups
groups, fac = find_groups(L, NUM_TO_SAMPLE)

# Save the groups to file
f_out = open(OUTPUT_PREFIX+'groups.txt', 'w')
f_out.write('Group\tDesigns\n')
group_num = 1
for el in groups:
	out_list = ['Group_'+str(group_num)]+[str(x) for x in el]
	f_out.write('\t'.join(out_list)+'\n')
	group_num += 1
f_out.close()

# Plot the dendrogram and distance matrix
matplotlib.rcParams['lines.linewidth'] = 25.0

fig = pylab.figure(figsize=(50,90))
ax1 = fig.add_axes([0.01,0.01,0.2,0.98], frameon=False)
Z1 = sch.dendrogram(L, orientation='right', labels=designs, color_threshold=fac*score_data.max())
ax1.set_xticks([])
ax1.tick_params(axis='y', labelsize=7)
ax1.set_ylabel('Design', labelpad=-2)
# Plot distance matrix.
axmatrix = fig.add_axes([0.22,0.01,0.77,0.98])
# Sort D and genes on the clustering
idx1 = Z1['leaves']
score_data = score_data[idx1,:]
score_data = score_data[:,idx1[::-1]]
#designs = [designs[i] for i in idx1]
im = axmatrix.matshow(score_data, aspect='auto', origin='lower', 
	                  cmap=pylab.cm.OrRd, vmin=0.0, vmax=score_data.max())
axmatrix.set_xticks([])
axmatrix.set_yticks([])
fig.savefig(OUTPUT_PREFIX+'matrix.pdf', transparent=True)
