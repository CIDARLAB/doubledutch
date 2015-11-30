function tableLibrary() {
	return {
		scope: {
			library: '='
		},
		restrict: 'E',
		link: function(scope, elem, attrs) {
			scope.library = {
				getLibraryData: function() {
					return this.libraryData;
				},
				libraryData: [["Part","Part Type","Strength","Strength_SD","REU","REU_SD","Part Sequence"],
					["Ru1","RBS","","",11.5,0.77,"cagatactgacaaataaaccagcgaaggaggttccta"],
					["Ru2","RBS","","",5.91,0.75,"aaggcgatcccaacgtagaggaggaaaccag"],
					["Rs1","RBS","","",2.89,0.27,"gatacccgtagaccattctgaaatcgaaggaggttttcc"],
					["Rs2","RBS","","",0.12,0.008,"aactccgcccaccacaataagccggaagagt"],
					["Rv1","RBS","","",0.23,0.005,"gcgactaggagcctaactcgccacaaggaaacat"],
					["Rv2","RBS","","",0.04,0.006,"accagcatacaattctttaaggataaccact"],
					["Rw1","RBS","","",0.14,0.002,"cagaaggcgagaactagatttaagggccattatag"],
					["Rw2","RBS","","",0.23,0.01,"ccgatagtttcaagagaaagggagtagaaacaga"],
					["Rz1","RBS","","",0.49,0.02,"acaagtcccgtattataaccgcctaggaggtgttgg"],
					["Rz2","RBS","","",0.05,0.009,"ttcaccagcccgaatcaatataggtcataca"],
					["Rm1","RBS","","",0.26,0.07,"tcagagactgaagttattacccaggaggtctata"],
					["Rm2","RBS","","",0.08,0.004,"taataagtacaacatcccccaggagcttcacagc"],
					["nifU","CDS","","","","","atgtggaactacagcgagaaagtcaaggaccatttcttcaatccgcgcaacgcgcgtgttgtggataacgcaaatgcggtgggcgacgtcggcagcttatcttgtggcgatgctctccgcttgatgctgcgcgtggacccgcagagcgaaatcatcgaagaagcgggctttcagaccttcggctgcggcagcgcgattgcgtcgtccagcgcactgacggagctgatcatcggtcacaccctggcggaagcgggtcagatcaccaaccagcagatcgccgactatctggacggcttaccgccggaaaagatgcactgctctgtaatgggccaggaagctcttcgtgcggccattgctaactttcgcggtgaatcgctggaagaggagcatgacgagggtaagctgatctgcaagtgcttcggcgtcgatgaaggccatattcgccgtgctgtccagaacaacggtcttacgacgctggccgaggtgatcaattacaccaaggcaggtggcggttgtaccagctgccatgagaaaatcgagctggccctggccgagattctcgcccaacagccgcaaaccaccccggcagttgcgtccggtaaagatccgcactggcagagcgtcgtggataccatcgctgaactgcgtccacatatccaagcggacggtggtgacatggcgctgttgtccgtgacgaaccaccaagtgactgtttcgctgtcgggcagctgttctggctgcatgatgaccgacatgaccctggcgtggctgcaacagaaattgatggagcgtaccggctgctatatggaagttgttgccgcctaa"],
					["nifS","CDS","","","","","atgaaacaagtgtacctggacaacaacgcgaccacccgcctggacccgatggttctggaagcgatgatgccgtttctcacggatttctatggcaatccgtccagcatccatgacttcggcatcccggcacaagcggcgctggaacgtgcgcaccagcaagctgcggcactgctgggcgcagagtacccgtctgaaatcattttcacgagctgtgcgaccgaggccactgcaaccgccattgcgtcggccatcgcgttattgccggaacgccgcgaaatcatcacctcggtagtggagcacccggctacgctggcggcgtgcgagcacctggaacgccaaggctatcgcatccatcgcattgcggtggatagcgaaggtgcgctggacatggcccagttccgtgcagcgctctcgccgcgtgtcgcgttggtgagcgtgatgtgggccaacaacgaaaccggcgtgctgttcccgattggcgaaatggccgagcttgcccacgagcagggcgctctgttccactgcgatgccgttcaggtcgttggcaaaatcccaattgctgttggccagacgcgcatcgacatgctgtcttgctccgcgcacaagtttcatggtccgaagggtgttggttgcttgtacttacgtcgtggcacgcgctttcgtccgctgcttcgcggtggccatcaagaatatggtcgccgtgccggcactgagaatatctgtggcatcgtcggcatgggcgctgcgtgcgaactggcgaacatccatctgccgggtatgacccatattggccagttacgcaatcgcctggagcaccgtctgctcgccagcgtgccgtccgtgatggttatgggcggtggtcagccgcgtgtaccgggtactgtcaacctggcgttcgagtttatcgaaggtgaagcgatcctgctcttgctgaaccaggctggcattgccgcaagctccggctccgcgtgtacctctggcagcttggagccgagccatgtgatgcgcgccatgaacattccatacaccgcggctcacggcaccattcgttttagcctgagccgttatacgcgcgagaaagagatcgactacgtcgttgcgaccctcccgccaatcattgatcgtctgcgtgccttgtccccgtattggcagaatggtaagccgcgtccggcagatgcagtctttaccccggtttacggttaa"],
					["nifV","CDS","","","","","atggagcgcgtcttgatcaacgatactaccctgcgtgatggcgaacaatctccgggcgtagcgtttcgtacctccgagaaagttgccatcgcggaggcactgtacgctgcgggtatcaccgcgatggaagtcggcactccggcgatgggtgatgaagagatcgcccgcattcagctggtgcgtcgtcaactgccggacgcgacgcttatgacctggtgccgtatgaacgctctggaaatccgtcagagcgcggatctgggtattgactgggtggatatctcgatcccagcatccgacaagctgcgtcagtacaagctgcgtgagccgctggccgtgctgctggagcgccttgcgatgtttatccatctggcccacacgttaggcctcaaagtatgtattggttgcgaggatgcgagccgtgcgtctggtcagaccctgcgcgccattgccgaggtggcccagcaatgcgcggctgcgcgcttgcgttacgctgacaccgtgggcctgctggacccgttcaccaccgcagcccagatcagcgccctgcgtgacgtttggtcgggcgagatcgagatgcatgctcacaatgatctgggcatggctaccgcgaacacgctggcggcagtttcggctggcgccacgtcggtgaacactaccgtcctcggtctgggtgaacgtgcaggcaacgcagccctggaaaccgttgcgctgggcctggaacgctgcctgggcgtggaaaccggcgtccatttcagcgcgctcccagcgctctgtcagcgcgtcgcggaggctgcacagcgcgcaatcgacccgcaacagccgctggtgggtgaattggttttcacccacgaatctggtgttcacgttgcggcgctgctgcgcgacagcgaatcctatcaatctattgccccaagcctcatgggccgtagctaccgtctggtgctcggcaagcattcgggtcgtcaggctgtcaacggtgttttcgaccagatgggttaccacctgaatgcggcgcagatcaatcagttgctgccggccattcgccgcttcgccgagaattggaaacgctctccgaaagactacgaactggttgcgatctatgacgaattgtgcggtgaatccgcccttcgtgctcgcggctaa"],
					["nifW","CDS","","","","","atggagtggttttaccagattccgggtgtagacgaattgcgcagcgctgaatccttctttcagttcttcgcggttccataccagccggaactgctgggccgctgctcgcttccggtgttagcgacgttccaccgtaaactgcgtgcggaggtcccgctgcaaaaccgtctggaggacaatgatcgtgcgccgtggctcttggcgcgccgcctcctggccgaatcttatcagcagcaatttcaggagagcggcacctaa"],
					["nifZ","CDS","","","","","atgcgcccgaaattcaccttctctgaagaggtccgcgtagttcgcgcgattcgtaatgatggcaccgtggcgggttttgcgccaggtgcgctgctggttcgtcgcggttcgacgggctttgtgcgtgactggggtgtgttcctgcaagaccagatcatctatcaaatccactttccggaaaccgaccgcattatcggctgtcgcgagcaggagttaatcccgattacccagccgtggttggctggtaacctccagtatcgtgacagcgtcacgtgccaaatggcactggctgtcaacggtgacgtggttgtgagcgccggtcaacgtggccgtgtggaggccactgatcgtggcgaacttggcgattcctacaccgtggacttcagcggccgttggttccgcgttccggtccaggccatcgcgctgattgaagagcgcgaagaataa"],
					["nifM","CDS","","","","","atgaatccgtggcagcgctttgcccgtcaacgccttgctcgcagccgctggaaccgtgatccggctgctctcgacccagccgataccccagcgttcgagcaggcgtggcagcgtcaatgccatatggaacaaaccatcgtagcgcgtgtcccggaaggcgatattccggctgccttactggaaaacatcgcggccagcctggcgatctggctggacgagggtgacttcgctccgccggagcgcgctgcgattgtgcgtcatcatgcacgtctggagctggcgtttgccgacattgcccgccaggcaccgcaaccggatctgagcacggttcaagcgtggtatctgcgtcaccagacgcaattcatgcgtccggagcagcgtctgacccgtcacctgctcctgacggtcgataatgatcgcgaggcggtgcatcaacgcatccttggcctgtatcgtcagatcaacgcgagccgtgacgccttcgccccactggcacagcgccactctcattgcccgtccgccttggaagaaggccgtctgggctggatctcccgtggtctgctgtacccgcagctcgaaaccgcgttgtttagcctggcggaaaacgcactgtcgctgccgattgcgtcggaattgggttggcacctgttatggtgcgaggccattcgtccggcagccccgatggagccgcaacaggcccttgaatctgcgcgcgactacttgtggcagcagagccagcagcgccaccagcgtcaatggctggagcagatgatttcccgccaaccgggcctgtgtggttaa"]]
			};
		}
	};
}