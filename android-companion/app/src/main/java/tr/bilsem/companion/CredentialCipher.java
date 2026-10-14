package tr.bilsem.companion;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/** Authenticated encryption only; no Android UI, logging or file access. */
public final class CredentialCipher {
    private static final byte[] CONTEXT="bilsem-mebbis-credentials-v1".getBytes(StandardCharsets.UTF_8);
    public static byte[] encrypt(SecretKey key,byte[] plaintext) throws Exception {
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key);cipher.updateAAD(CONTEXT);
        byte[] encrypted=cipher.doFinal(plaintext),iv=cipher.getIV();
        if(iv.length!=12)throw new IllegalStateException("Invalid IV");
        byte[] result=new byte[iv.length+encrypted.length];System.arraycopy(iv,0,result,0,iv.length);System.arraycopy(encrypted,0,result,iv.length,encrypted.length);return result;
    }
    public static byte[] decrypt(SecretKey key,byte[] blob) throws Exception {
        if(blob.length<28)throw new IllegalArgumentException("Invalid ciphertext");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,Arrays.copyOfRange(blob,0,12)));cipher.updateAAD(CONTEXT);
        return cipher.doFinal(blob,12,blob.length-12);
    }
    private CredentialCipher() {}
}
