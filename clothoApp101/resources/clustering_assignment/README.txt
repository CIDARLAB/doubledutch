Concept:
permute all assignments of repressors to gates.
given 24 unique assignments, test 6 that are highly dissimilar.
See Powerpoint: Prashant_ClothoRelease_assignment_clustering.pptx


Steps:

1) from user, assignments CSV: data/prashant_mux_1424790299850_assignments.csv

2) convert CSV to pairwise distance matrix
   I did this using Main.java.  You'll probably want to you JavaScript.
   >javac Main.java
   >java Main data/prashant_mux_1424790299850_assignments.csv
   This was done to generate the matrix: data/prashant_mux_1424790299850_matrix.txt

3) Python script to cluster and pick 6 designs:
   >python cluster_and_extract.py
   Results (groups text file and a PDF) are saved in results directory.  
   Options (input matrix, #designs) are hard-coded in python script, see top of script.
   
4) get one design per group: results/prashant_mux_groups.txt


Acknowledgements: Bryan Der, Tom Gorochowski, Emerson Glassey (Voigt lab)
