import java.util.ArrayList;
import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.File;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.StringTokenizer;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;

public class Util {

    public static ArrayList<String> fileLines(String fin) {

        File file = new File(fin);
        BufferedReader br;
        FileReader fr;
        ArrayList<String> lines = new ArrayList<String>();
        try {
            fr = new FileReader(file);
            br = new BufferedReader(fr);
            String line;
            try {
                while((line = br.readLine()) != null ) {
                    if(line.length() > 0) {
                        lines.add(line);
                    }
                }
            }
            catch (IOException ex) {
                System.out.println("IOException when reading " + fin);
            }
        }
        catch (FileNotFoundException ex) {
            System.out.println("FileNotFoundException when reading " + fin);
        }

        return lines;
    }


}
