package tr.bilsem.companion;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.json.JSONObject;

/** The encryption key never leaves AndroidKeyStore; preferences contain only ciphertext. */
final class CredentialVault {
    private static final String ALIAS="bilsem.mebbis.credentials.v1";
    private final SharedPreferences preferences;
    CredentialVault(Context context) {preferences=context.getSharedPreferences("mebbis_vault",Context.MODE_PRIVATE);}
    boolean exists() {return preferences.contains("ciphertext");}
    private SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(store.containsAlias(ALIAS))return (SecretKey)store.getKey(ALIAS,null);
        KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).setRandomizedEncryptionRequired(true).build());
        return generator.generateKey();
    }
    void save(String username,String password) throws Exception {
        byte[] plaintext=new JSONObject().put("username",username).put("password",password).toString().getBytes(StandardCharsets.UTF_8);
        try {String encrypted=Base64.encodeToString(CredentialCipher.encrypt(key(),plaintext),Base64.NO_WRAP);if(!preferences.edit().putString("ciphertext",encrypted).commit())throw new IllegalStateException("Storage failed");}
        finally {Arrays.fill(plaintext,(byte)0);}
    }
    JSONObject read() throws Exception {
        if(!exists())return null;
        byte[] plaintext=CredentialCipher.decrypt(key(),Base64.decode(preferences.getString("ciphertext",""),Base64.NO_WRAP));
        try{return new JSONObject(new String(plaintext,StandardCharsets.UTF_8));}finally{Arrays.fill(plaintext,(byte)0);}
    }
    void clear() throws Exception {
        if(!preferences.edit().remove("ciphertext").commit())throw new IllegalStateException("Storage failed");
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);if(store.containsAlias(ALIAS))store.deleteEntry(ALIAS);
    }
}
