import tr.bilsem.companion.CredentialCipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.util.Arrays;
import java.nio.charset.StandardCharsets;

public class CredentialCipherTest {
    public static void main(String[] args) throws Exception {
        KeyGenerator generator=KeyGenerator.getInstance("AES");generator.init(256);SecretKey key=generator.generateKey();
        byte[] secret="synthetic-user-and-password".getBytes(StandardCharsets.UTF_8);
        byte[] first=CredentialCipher.encrypt(key,secret),second=CredentialCipher.encrypt(key,secret);
        if(!Arrays.equals(secret,CredentialCipher.decrypt(key,first)))throw new AssertionError("Roundtrip failed");
        if(Arrays.equals(first,second))throw new AssertionError("IV was reused");
        if(new String(first,StandardCharsets.ISO_8859_1).contains("synthetic-user"))throw new AssertionError("Plaintext present");
        byte[] altered=first.clone();altered[altered.length-1]^=1;boolean rejected=false;
        try{CredentialCipher.decrypt(key,altered);}catch(javax.crypto.AEADBadTagException e){rejected=true;}
        if(!rejected)throw new AssertionError("Tampering accepted");
        rejected=false;try{CredentialCipher.decrypt(generator.generateKey(),first);}catch(javax.crypto.AEADBadTagException e){rejected=true;}
        if(!rejected)throw new AssertionError("Wrong key accepted");
        System.out.println("Credential cipher: roundtrip, random IV, no plaintext, tamper and wrong-key rejection passed.");
    }
}
