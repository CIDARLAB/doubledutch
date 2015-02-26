import java.util.ArrayList;


public class Main {


    public static void main(String args[]){

        ArrayList<ArrayList<String>> variants = new ArrayList<ArrayList<String>>();

        ArrayList<String> lines = Util.fileLines(args[0]);
        for(String s: lines) {

            ArrayList<String> variant = new ArrayList<String>();

            String[] parts = s.split("(\\s|,)+");

            for(int i=3; i<parts.length; ++i) {
                String p = parts[i];
                variant.add(p);
                if(p.contains("-")) {
                    String[] repressor = s.split("(-)+");
                    variant.add(repressor[1]);
                }
            }

            variants.add(variant);
        }

        String column_labels = "_\t";
        for(int i=0; i<variants.size(); ++i) {
            column_labels += (i+1) + "\t";
        }
        System.out.println(column_labels);

        for(int i=0; i<variants.size(); ++i) {

            String row = "";

            for(int j=0; j<variants.size(); ++j) {

                if(j==0) {
                    row += (i+1) + "\t";
                }

                int score = 0;

                for(int k=0; k<variants.get(i).size(); ++k) {
                   if(!variants.get(i).get(k).equals(variants.get(j).get(k))) {
                       score++;
                   }
                }
                row += score + "\t";
                //System.out.println("i:" + (i+1) + " j:"+(j+1) + " score:"+score);
            }
            System.out.println(row);
        }


    }


}
